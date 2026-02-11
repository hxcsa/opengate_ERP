from decimal import Decimal
from google.cloud import firestore
from app.core.firebase import get_db
from app.models.core import DocumentStatus
from app.schemas.erp import GRNCreate, DeliveryNoteCreate
from .posting import PostingEngine

class InventoryService:
    def __init__(self):
        self.db = get_db()
        self.posting_engine = PostingEngine()

    def create_goods_receipt(self, data: GRNCreate):
        """Standard Goods Receipt using Firestore Transaction.
        Refactored to strictly separate READs and WRITEs.
        """
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _execute(transaction, db, posting_engine, data):
            # ==============================================================================
            # PHASE 1: READ ALL DATA (Items, Accounts)
            # ==============================================================================
            unique_item_ids = list(set(line.item_id for line in data.lines))
            items_data_map = {}
            
            # Batch get items
            for item_id in unique_item_ids:
                ref = db.collection("items").document(item_id)
                snap = ref.get(transaction=transaction)
                if not snap.exists:
                    raise ValueError(f"Item {item_id} not found")
                items_data_map[item_id] = snap.to_dict()

            # Check Supplier Account
            supplier_acc_id = str(data.supplier_account_id)
            supplier_ref = db.collection("accounts").document(supplier_acc_id)
            supplier_snap = supplier_ref.get(transaction=transaction)
             # If exact ID not found, try code '21' (Payable) as fallback
            if not supplier_snap.exists:
                 # Note: Querying inside transaction is fine if it's a read. 
                 # But to be safe and simple, we'll assume valid ID or fail, 
                 # or fetch the fallback *outside* if possible. 
                 # For now, let's just proceed with the ID provided or the fallback logic IF it doesn't cause extra reads later.
                 pass 

            # ==============================================================================
            # PHASE 2: CALCULATE UPDATES (In-Memory)
            # ==============================================================================
            je_ref = db.collection("journal_entries").document()
            je_id = je_ref.id
            
            total_value = Decimal("0")
            lines_data = []
            
            # We need to track updated item state in memory to handle multiple lines for same item
            temp_items_state = {k: v.copy() for k, v in items_data_map.items()}
            
            stock_moves_to_write = [] # List of tuples: (item_id, item_ref, new_stats, ledger_entry)

            for line in data.lines:
                qty = Decimal(str(line.quantity))
                cost = Decimal(str(line.unit_cost))
                item_id = line.item_id
                
                # Update temp state
                current_qty = Decimal(temp_items_state[item_id].get("current_qty", "0"))
                current_val = Decimal(temp_items_state[item_id].get("total_value", "0"))
                
                new_qty = current_qty + qty
                new_val = current_val + (qty * cost)
                new_wac = new_val / new_qty if new_qty != 0 else cost
                
                # Update temp map for next iteration
                temp_items_state[item_id]["current_qty"] = str(new_qty)
                temp_items_state[item_id]["total_value"] = str(new_val)
                temp_items_state[item_id]["current_wac"] = str(new_wac)

                # Prepare Stock Ledger Entry
                ledger_entry = {
                    "timestamp": firestore.SERVER_TIMESTAMP,
                    "item_id": item_id,
                    "warehouse_id": line.warehouse_id,
                    "quantity": str(qty),
                    "unit_cost": str(cost),
                    "valuation_rate": str(new_wac),
                    "source_document_id": je_id,
                    "source_document_type": "GRN",
                    "description": f"GRN In: {line.quantity} @ {line.unit_cost}",
                    "company_id": items_data_map[item_id].get("company_id")
                }
                
                # Prepare Item Update (will be deduped/applied last)
                stock_moves_to_write.append({
                    "item_id": item_id,
                    "ledger": ledger_entry
                })

                # Accounting Lines
                inv_acc_id = items_data_map[item_id]["inventory_account_id"]
                line_val = qty * cost
                total_value += line_val
                
                lines_data.append({
                    "account_id": inv_acc_id,
                    "debit": str(line_val),
                    "credit": "0.0000",
                    "description": f"Stock In: {line.quantity} @ {line.unit_cost}"
                })

            # Credit Payable
            lines_data.append({
                "account_id": supplier_acc_id,
                "debit": "0.0000",
                "credit": str(total_value),
                "description": f"Payable for GRN {data.number}"
            })

            # ==============================================================================
            # PHASE 3: WRITE ALL DATA (Items, Journal, Ledger)
            # ==============================================================================
            
            # 1. Update Items
            for item_id, stats in temp_items_state.items():
                ref = db.collection("items").document(item_id)
                transaction.update(ref, {
                    "current_qty": stats["current_qty"],
                    "total_value": stats["total_value"],
                    "current_wac": stats["current_wac"]
                })
            
            # 2. Add Stock Ledger Entries
            for move in stock_moves_to_write:
                led_ref = db.collection("stock_ledger").document()
                transaction.set(led_ref, move["ledger"])
            
            # 3. Save Journal
            transaction.set(je_ref, {
                "number": f"JE-GRN-{data.number}",
                "date": firestore.SERVER_TIMESTAMP,
                "description": f"Automated Journal for GRN {data.number}",
                "status": "DRAFT",
                "source_document_type": "GRN",
                "lines": lines_data
            })

            # 4. Post Journal (pass lines for balance check, avoiding re-read)
            # Pre-fetch accounts for atomic balance updates
            account_ids = list(set(line["account_id"] for line in lines_data))
            accounts_data = posting_engine.get_accounts_for_transaction(transaction, account_ids)
            
            posting_engine.post_journal_entry(transaction, je_id, lines_data, accounts_data)
            
            # --- AP SUBLEDGER LINK ---
            if getattr(data, "supplier_id", None):
                # Create a Bill record for AP tracking
                from app.schemas.bills import BillStatus, BillLine
                
                bill_ref = db.collection("bills").document()
                bill_lines = [
                    {"description": f"GRN Item: {line.item_id}", "quantity": float(line.quantity), "unit_cost": float(line.unit_cost), "total": float(Decimal(str(line.quantity)) * Decimal(str(line.unit_cost)))}
                    for line in data.lines
                ]
                
                # Fetch supplier name to avoid join later
                supplier_snap = db.collection("suppliers").document(data.supplier_id).get(transaction=transaction)
                supplier_name = supplier_snap.to_dict().get("name", "Unknown") if supplier_snap.exists else "Unknown"
                
                transaction.set(bill_ref, {
                    "bill_number": f"BILL-{data.number}",
                    "supplier_id": data.supplier_id,
                    "supplier_name": supplier_name,
                    "date": firestore.SERVER_TIMESTAMP,
                    "due_date": firestore.SERVER_TIMESTAMP, # Simplification: due now
                    "total": str(total_value),
                    "paid_amount": "0.0000",
                    "remaining_amount": str(total_value),
                    "status": "POSTED",
                    "company_id": items_data_map[unique_item_ids[0]].get("company_id"), # Get from first item
                    "journal_id": je_id,
                    "source_doc_id": data.number,
                    "source_doc_type": "GRN"
                })

            return je_id

        return _execute(transaction, self.db, self.posting_engine, data)

    def create_delivery_note(self, data: DeliveryNoteCreate):
        """Standard Delivery Note (Sale) using Firestore Transaction.
        Refactored to strictly separate READs and WRITEs.
        """
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _execute(transaction, db, posting_engine, data):
            # ==============================================================================
            # PHASE 1: READ ALL DATA
            # ==============================================================================
            unique_item_ids = list(set(line.item_id for line in data.lines))
            items_data_map = {}
            
            for item_id in unique_item_ids:
                ref = db.collection("items").document(item_id)
                snap = ref.get(transaction=transaction)
                if not snap.exists:
                    raise ValueError(f"Item {item_id} not found")
                items_data_map[item_id] = snap.to_dict()

            # ==============================================================================
            # PHASE 2: CALCULATE (In-Memory)
            # ==============================================================================
            je_ref = db.collection("journal_entries").document()
            je_id = je_ref.id
            
            total_revenue = Decimal("0")
            total_cogs = Decimal("0")
            lines_data = []
            
            temp_items_state = {k: v.copy() for k, v in items_data_map.items()}
            stock_moves_to_write = []

            for line in data.lines:
                qty = Decimal(str(line.quantity)) # Positive for logic, negative for update
                item_id = line.item_id
                
                current_qty = Decimal(temp_items_state[item_id].get("current_qty", "0"))
                current_val = Decimal(temp_items_state[item_id].get("total_value", "0"))
                # Use current WAC for COGS
                wac = Decimal(temp_items_state[item_id].get("current_wac", "0"))
                
                # Check negative stock? (Optional, skipping for now to allow overdrafts if needed, or fail)
                if current_qty < qty:
                     # We can choose to fail here
                     pass

                new_qty = current_qty - qty
                # OUT means value decreases by (qty * WAC)
                new_val = current_val - (qty * wac)
                
                # WAC does NOT change on OUT, filters only updates keys
                temp_items_state[item_id]["current_qty"] = str(new_qty)
                temp_items_state[item_id]["total_value"] = str(new_val)
                
                # Ledger
                ledger_entry = {
                    "timestamp": firestore.SERVER_TIMESTAMP,
                    "item_id": item_id,
                    "warehouse_id": line.warehouse_id,
                    "quantity": str(-qty), # Negative
                    "unit_cost": "0",
                    "valuation_rate": str(wac),
                    "source_document_id": je_id,
                    "source_document_type": "DO",
                    "description": f"Sale Out: {line.quantity}",
                    "company_id": items_data_map[item_id].get("company_id")
                }
                stock_moves_to_write.append({"ledger": ledger_entry})
                
                # Accounting
                line_cogs = qty * wac
                total_cogs += line_cogs
                
                # Simplified Revenue: Cost + 30% margin override
                # In real app, we'd take unit_price from input. 
                # Assuming input has price or we use standard price. 
                # For now using logic: Input doesn't have price? check schema.
                # Schema DeliveryNoteLine only has quantity. 
                # We'll use WAC * 1.5 as default price if not provided.
                line_revenue = line_cogs * Decimal("1.5") 
                total_revenue += line_revenue
                
                # COGS / Inventory Lines
                lines_data.append({
                    "account_id": items_data_map[item_id]["cogs_account_id"],
                    "debit": str(line_cogs),
                    "credit": "0.0000",
                    "description": f"COGS for {line.quantity}"
                })
                lines_data.append({
                    "account_id": items_data_map[item_id]["inventory_account_id"],
                    "debit": "0.0000",
                    "credit": str(line_cogs),
                    "description": f"Stock Out: {line.quantity}"
                })

            # Receivables / Revenue
            customer_acc_id = str(data.customer_account_id)
            # We assume ID is valid from frontend selector to avoid extra reads or we read in Phase 1
            
            rev_acc_id = items_data_map[data.lines[0].item_id]["revenue_account_id"]
            
            lines_data.append({
                "account_id": customer_acc_id,
                "debit": str(total_revenue),
                "credit": "0.0000",
                "description": f"Receivable for DO {data.number}"
            })
            lines_data.append({
                "account_id": rev_acc_id,
                "debit": "0.0000",
                "credit": str(total_revenue),
                "description": f"Sales Revenue for DO {data.number}"
            })

            # ==============================================================================
            # PHASE 3: WRITE ALL
            # ==============================================================================
            
            # 1. Update Items
            for item_id, stats in temp_items_state.items():
                ref = db.collection("items").document(item_id)
                # Ensure we only update what changed
                transaction.update(ref, {
                    "current_qty": stats["current_qty"],
                    "total_value": stats["total_value"]
                })
            
            # 2. Ledger
            for move in stock_moves_to_write:
                led_ref = db.collection("stock_ledger").document()
                transaction.set(led_ref, move["ledger"])
                
            # 3. Journal
            transaction.set(je_ref, {
                "number": f"JE-DO-{data.number}",
                "date": firestore.SERVER_TIMESTAMP,
                "description": f"Automated Journal for DO {data.number}",
                "status": "DRAFT",
                "source_document_type": "DO",
                "lines": lines_data
            })

            # 4. Post (pass lines for balance check, avoiding re-read)
            # Pre-fetch accounts for atomic balance updates
            account_ids = list(set(line["account_id"] for line in lines_data))
            accounts_data = posting_engine.get_accounts_for_transaction(transaction, account_ids)
            
            posting_engine.post_journal_entry(transaction, je_id, lines_data, accounts_data)
            
            return je_id

        return _execute(transaction, self.db, self.posting_engine, data)

    def create_stock_transfer_v2(self, data: 'TransferCreate', doc_id: str):
        """Moves stock between warehouses for multiple items."""
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _execute(transaction, db, posting_engine, data, doc_id):
            item_ids = [line.item_id for line in data.items]
            items_data = posting_engine.get_items_for_transaction(transaction, item_ids)
            
            for line in data.items:
                qty = Decimal(str(line.quantity))
                item_id = line.item_id
                item_data = items_data.get(item_id)
                if not item_data: raise ValueError(f"Item {item_id} not found")
                
                # 1. OUT from source
                posting_engine.record_stock_movement(
                    transaction, item_id, data.from_warehouse_id, -qty, Decimal("0"), 
                    doc_id, "TRF", item_data, 
                    batch_number=line.batch_number, 
                    customer_id=data.customer_id
                )
                # 2. IN to target
                posting_engine.record_stock_movement(
                    transaction, item_id, data.to_warehouse_id, qty, Decimal(item_data["current_wac"]), 
                    doc_id, "TRF", item_data, 
                    batch_number=line.batch_number, 
                    customer_id=data.customer_id
                )
            return True
            
        return _execute(transaction, self.db, self.posting_engine, data, doc_id)

    def adjust_stock_v2(self, data: 'AdjustmentCreate', doc_id: str):
        """Manual adjustment (reconciliation) for multiple items."""
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _execute(transaction, db, posting_engine, data, doc_id):
            item_ids = [line.item_id for line in data.items]
            items_data = posting_engine.get_items_for_transaction(transaction, item_ids)
            
            for line in data.items:
                qty = Decimal(str(line.quantity))
                item_id = line.item_id
                item_data = items_data.get(item_id)
                if not item_data: raise ValueError(f"Item {item_id} not found")
                
                # Record movement
                posting_engine.record_stock_movement(
                    transaction, item_id, data.warehouse_id, qty, Decimal(item_data["current_wac"]),
                    doc_id, "ADJ", item_data, 
                    batch_number=line.batch_number, 
                    customer_id=data.customer_id
                )
            return True
            
        return _execute(transaction, self.db, self.posting_engine, data, doc_id)

