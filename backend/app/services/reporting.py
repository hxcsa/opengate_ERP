from datetime import datetime, time
from decimal import Decimal
from typing import List, Dict, Any, Optional
from google.cloud import firestore
from app.core.firebase import get_db

class ReportingService:
    def __init__(self):
        self.db = get_db()
    
    async def get_trial_balance(self, company_id: str, as_of_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Returns a list of all accounts with their balances.
        If as_of_date is provided, we might need to calculate backwards (complex),
        OR just return current balances if date is today/none.
        For MVP, we return CURRENT balances from the accounts collection.
        Real date-based TB requires computing history from JEs.
        """
        # MVP: Current Balances only. 
        # TODO: Implement historical TB by reversing JEs from current balance.
        
        accounts_ref = self.db.collection("accounts").where("company_id", "==", company_id)
        docs = accounts_ref.stream()
        
        tb_data = []
        total_debit = Decimal("0")
        total_credit = Decimal("0")
        
        for doc in docs:
            data = doc.to_dict()
            bal = Decimal(data.get("balance", "0"))
            
            # Determine Debit/Credit columns based on Account Type
            # Asset/Expense: Positive balance is Debit.
            # Liability/Equity/Revenue: Positive balance is Credit.
            # But specific accounting implementation might vary. 
            # Usually: Debit = Positive, Credit = Negative in 'balance' field?
            # Or 'balance' is absolute and Type determines side?
            # Let's check PostingEngine: new_balance = new_debit - new_credit.
            # So Positive = Debit, Negative = Credit.
            
            row = {
                "account_id": doc.id,
                "code": data.get("code"),
                "name": data.get("name_en"), # Should support locale
                "type": data.get("type"),
                "debit": "0.00",
                "credit": "0.00",
                "net_balance": str(bal)
            }
            
            if bal > 0:
                row["debit"] = str(bal)
                total_debit += bal
            elif bal < 0:
                row["credit"] = str(abs(bal))
                total_credit += abs(bal)
                
            tb_data.append(row)
            
        # Sort by code
        tb_data.sort(key=lambda x: x["code"])
        
        return {
            "rows": tb_data,
            "total_debit": str(total_debit),
            "total_credit": str(total_credit)
        }

    async def get_customer_statement(self, company_id: str, customer_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """
        Generates a statement for a specific customer.
        1. Find Customer's AR Account.
        2. Calculate Opening Balance (Sum lines before start_date).
        3. Fetch transactions within range.
        4. Calculate Closing Balance.
        """
        
        # 1. Get Customer AR Account
        cust_ref = self.db.collection("customers").document(customer_id)
        cust_snap = cust_ref.get()
        if not cust_snap.exists:
            raise ValueError("Customer not found")
            
        cust_data = cust_snap.to_dict()
        ar_account_id = cust_data.get("ar_account_id")
        
        if not ar_account_id:
            # Fallback or Error? 
            # Try finding account with code matching customer? No, too risky.
            # For now, simplistic assumption:
            raise ValueError("Customer does NOT have a linked AR Account configured.")

        # 2. Normalize dates to UTC to avoid TypeError with Firebase timestamps
        from datetime import timezone
        if start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)

        # 3. Get Current Balance for accurate back-calculation
        acc_ref = self.db.collection("accounts").document(ar_account_id)
        acc_snap = acc_ref.get()
        if not acc_snap.exists:
             raise ValueError("Linked AR Account not found")
        
        current_balance = Decimal(acc_snap.to_dict().get("balance", "0"))

        # 4. Strategy: Fetch ALL POSTED Journal Entries for the company 
        # and filter in-memory to avoid index requirements for now.
        je_query = self.db.collection("journal_entries")\
            .where("company_id", "==", company_id)\
            .where("status", "==", "POSTED")
            
        jes = list(je_query.stream())
        
        report_lines = []
        period_net_change = Decimal("0")
        future_net_change = Decimal("0")
        pre_period_net_change = Decimal("0") # (opening balance should be based on this if we used a different strategy)
        
        for je in jes:
            data = je.to_dict()
            je_date = data.get("date") # DatetimeWithNanoseconds
            
            # Normalize je_date if needed (Firestore usually returns aware)
            if je_date.tzinfo is None:
                je_date = je_date.replace(tzinfo=timezone.utc)
                
            # Find lines for this account
            relevant_lines = [l for l in data.get("lines", []) if l.get("account_id") == ar_account_id]
            
            for line in relevant_lines:
                debit = Decimal(str(line.get("debit", "0")))
                credit = Decimal(str(line.get("credit", "0")))
                net = debit - credit
                
                # Check date bucket
                if je_date < start_date:
                    pre_period_net_change += net
                elif je_date <= end_date:
                    report_lines.append({
                        "date": je_date,
                        "number": data.get("number"),
                        "description": data.get("description"),
                        "debit": str(debit),
                        "credit": str(credit),
                        "balance_impact": str(net),
                        "memo": line.get("memo")
                    })
                    period_net_change += net
                else: # Future transaction (je_date > end_date)
                    future_net_change += net

        # Sort report lines by date
        report_lines.sort(key=lambda x: x["date"])

        # Review Math:
        # Current Balance = Opening_Historic + PrePeriod + Period + Future
        # Opening_at_Start = Current - Period - Future? 
        # NO. If we fetch ALL history, then Opening = PrePeriod.
        # But if we don't know when company started, using Current is safer.
        # Opening_at_Start = Current - Period - Future
        
        opening_balance = current_balance - period_net_change - future_net_change
        closing_balance = opening_balance + period_net_change
        

        
        return {
            "customer_name": cust_data.get("name"),
            "account_name": acc_snap.to_dict().get("name_en"),
            "currency": acc_snap.to_dict().get("currency", "IQD"),
            "opening_balance": str(opening_balance),
            "closing_balance": str(closing_balance),
            "period_lines": report_lines,
            "period_totals": {
                "debit": str(sum(Decimal(l["debit"]) for l in report_lines)),
                "credit": str(sum(Decimal(l["credit"]) for l in report_lines))
            }
        }
    async def get_general_ledger(self, company_id: str, account_id: str, from_date: datetime, to_date: datetime) -> Dict[str, Any]:
        """
        Calculates the general ledger for a specific account.
        1. Fetch opening balance by summing all JEs before from_date.
        2. Fetch all JEs in range.
        3. Build running balance.
        """
        # 1. Get Account Details
        acc_ref = self.db.collection("accounts").document(account_id)
        acc_snap = acc_ref.get()
        if not acc_snap.exists:
            raise ValueError("Account not found")
        acc_data = acc_snap.to_dict()

        # Normalize dates for comparison
        from datetime import timezone
        if from_date.tzinfo is None:
            from_date = from_date.replace(tzinfo=timezone.utc)
        if to_date.tzinfo is None:
            to_date = to_date.replace(tzinfo=timezone.utc)

        # 2. Get Current Balance for back-calculation or just sum from start
        # To be safe and avoid issues with missing historical data, we use the account's current balance
        # as the ground truth at 'now' and work backwards, similar to customer statement.
        current_balance = Decimal(acc_data.get("balance", "0"))

        # 3. Fetch JEs for this account
        # Optimization: Use flat_account_ids if it exists to query efficiently
        je_query = self.db.collection("journal_entries")\
            .where("company_id", "==", company_id)\
            .where("status", "==", "POSTED")
        
        # We might want to filter by account if possible, but Firestore doesn't support 'in' with arrays nicely for many IDs.
        # However, we can use array_contains if we store all account IDs in a flat array on the JE.
        # For now, let's filter in-memory to be safe unless we are sure about the field name.
        # Actually, looking at AccountingService.create_journal_entry, I see:
        # "flat_account_ids": account_ids
        je_query = je_query.where("flat_account_ids", "array_contains", account_id)
        
        jes = list(je_query.stream())
        
        report_lines = []
        period_net_change = Decimal("0")
        future_net_change = Decimal("0")
        
        for je in jes:
            data = je.to_dict()
            je_date = data.get("date")
            if je_date.tzinfo is None:
                je_date = je_date.replace(tzinfo=timezone.utc)
            
            # Find relevant lines in this JE
            lines = [l for l in data.get("lines", []) if l.get("account_id") == account_id]
            for l in lines:
                debit = Decimal(str(l.get("debit", "0")))
                credit = Decimal(str(l.get("credit", "0")))
                net = debit - credit
                
                if je_date < from_date:
                    pass # We will calculate opening balance by subtracting period and future from current
                elif je_date <= to_date:
                    report_lines.append({
                        "id": je.id,
                        "date": je_date.isoformat(),
                        "number": data.get("number", ""),
                        "description": data.get("description", ""),
                        "memo": l.get("memo", ""),
                        "debit": str(debit),
                        "credit": str(credit),
                        "net": net
                    })
                    period_net_change += net
                else:
                    future_net_change += net

        # To calculate Opening Balance correctly:
        # Current = sum(ALL)
        # Opening_at_from_date = Current - sum(from_date to NOW)
        # where sum(from_date to NOW) = period_net_change + future_net_change
        opening_balance = current_balance - period_net_change - future_net_change
        
        # Sort and build running balance
        report_lines.sort(key=lambda x: x["date"])
        
        running = opening_balance
        final_lines = []
        for line in report_lines:
            running += line["net"]
            final_lines.append({
                **line,
                "balance": str(running)
            })
            
        return {
            "account": {
                "code": acc_data.get("code"),
                "name_ar": acc_data.get("name_ar"),
                "name_en": acc_data.get("name_en"),
                "type": acc_data.get("type")
            },
            "opening_balance": str(opening_balance),
            "items": final_lines,
            "total_debit": str(sum(Decimal(l["debit"]) for l in final_lines)),
            "total_credit": str(sum(Decimal(l["credit"]) for l in final_lines)),
            "closing_balance": str(running)
        }
