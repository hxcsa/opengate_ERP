from decimal import Decimal
from typing import Optional, Dict, Any
from google.cloud import firestore
from app.core.firebase import get_db
from app.models.core import JournalEntry, DocumentStatus

class PostingEngine:
    def __init__(self):
        self.db = get_db()

    def post_journal_entry(self, transaction, entry_id: str, lines_data: list = None):
        """Finalizes a journal entry using Firestore Transaction.
        NOTE: This method must be called from within an existing @firestore.transactional function.
        IMPORTANT: DO NOT READ THE JOURNAL HERE. We update status directly. Balance check happens before calling.
        """
        entry_ref = self.db.collection("journal_entries").document(entry_id)
        
        # If lines_data is provided, validate balance; otherwise, trust the caller already validated.
        if lines_data:
            total_debit = Decimal("0")
            total_credit = Decimal("0")
            for line in lines_data:
                total_debit += Decimal(str(line.get("debit", "0")))
                total_credit += Decimal(str(line.get("credit", "0")))
            if abs(total_debit - total_credit) > Decimal("0.0001"):
                raise ValueError(f"Journal does not balance: D:{total_debit} C:{total_credit}")

        # Update status directly
        transaction.update(entry_ref, {"status": "POSTED"})

        # --- REAL-TIME BALANCE UPDATE (ORACLE MODE) ---
        if lines_data:
            for line in lines_data:
                acc_id = line.get("account_id")
                if not acc_id: continue
                
                debit = Decimal(str(line.get("debit", "0")))
                credit = Decimal(str(line.get("credit", "0")))
                
                # We must READ the account to get current balance
                # BUT we are in a transaction, so we must separate reads first? 
                # Firestore transactions require all reads before writes.
                # However, since we didn't read accounts at the top, we might hit a limitation here 
                # if we try to read "accounts" now after writing "journal_entries".
                # FIX: We should have read accounts before the update. 
                # OR simpler for now: Use FieldValue.increment if available, but Python SDK uses transactional get/update.
                
                # To clear the "Read after Write" error, we will do a separate atomic increment operation 
                # or we just rely on the fact that for "High Scale" we might want to use 
                # Distributed Counters or just accept the Read-Write pattern.
                
                # Let's use the transform `increment` which doesn't require a read!
                # perfect for high throughput.
                acc_ref = self.db.collection("accounts").document(acc_id)
                transaction.update(acc_ref, {
                    "total_debit": firestore.Increment(float(debit)),
                    "total_credit": firestore.Increment(float(credit)),
                    "balance": firestore.Increment(float(debit - credit)) 
                })
        
        return True

    def get_items_for_transaction(self, transaction, item_ids: list[str]) -> Dict[str, Dict[str, Any]]:
        """Pre-fetches multiple items for a transaction to avoid Read-after-Write violations.
        Call this at the VERY BEGINNING of your @firestore.transactional function.
        """
        if not item_ids:
            return {}
            
        # Remove duplicates
        unique_ids = list(set(item_ids))
        refs = [self.db.collection("items").document(iid) for iid in unique_ids]
        
        # Firestore transactional get supports multiple refs
        snapshots = self.db.get_all(refs, transaction=transaction)
        
        return {snap.id: snap.to_dict() or {} for snap in snapshots}

    def record_stock_movement(
        self,
        transaction,
        item_id: str,
        warehouse_id: str,
        quantity: Decimal,
        unit_cost: Decimal,
        doc_id: Optional[str] = None,
        doc_type: Optional[str] = None,
        item_data: Optional[Dict[str, Any]] = None
    ):
        """Records stock movement in Firestore transaction and updates WAC.
        IMPORTANT: This must be called from within a @firestore.transactional function.
        To avoid Read-after-Write errors, pass item_data (pre-fetched via get_items_for_transaction).
        """
        item_ref = self.db.collection("items").document(item_id)
        
        # If item_data is not provided, we try to read it. 
        # CAUTION: This will FAIL if any writes have already occurred in this transaction!
        if item_data is None:
            snapshot = item_ref.get(transaction=transaction)
            item_data = snapshot.to_dict() or {}
        
        current_qty = Decimal(item_data.get("current_qty", "0"))
        current_value = Decimal(item_data.get("total_value", "0"))
        
        new_qty = current_qty + quantity
        
        if quantity > 0: # IN
            new_value = current_value + (quantity * unit_cost)
            new_valuation_rate = new_value / new_qty if new_qty != 0 else unit_cost
        else: # OUT
            new_valuation_rate = Decimal(item_data.get("current_wac", str(unit_cost)))
            new_value = current_value + (quantity * new_valuation_rate) # quantity is negative

        # Update Item metadata in the transaction
        transaction.update(item_ref, {
            "current_qty": str(new_qty),
            "total_value": str(new_value),
            "current_wac": str(new_valuation_rate)
        })

        # Add Ledger Entry
        movement_ref = self.db.collection("stock_ledger").document()
        transaction.set(movement_ref, {
            "timestamp": firestore.SERVER_TIMESTAMP,
            "item_id": item_id,
            "warehouse_id": warehouse_id,
            "quantity": str(quantity),
            "unit_cost": str(unit_cost),
            "valuation_rate": str(new_valuation_rate),
            "source_document_id": doc_id,
            "source_document_type": doc_type
        })
        
        # Update the provided item_data dictionary so subsequent calls in the same transaction
        # see the updated values without re-reading from Firestore.
        item_data["current_qty"] = str(new_qty)
        item_data["total_value"] = str(new_value)
        item_data["current_wac"] = str(new_valuation_rate)
        
        return new_valuation_rate
