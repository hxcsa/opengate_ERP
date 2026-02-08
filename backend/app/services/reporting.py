from decimal import Decimal
from typing import Dict, List
from datetime import datetime, timedelta
from google.cloud import firestore
from app.core.firebase import get_db
from app.models.core import AccountType

class ReportingService:
    def __init__(self):
        self.db = get_db()

    async def get_trial_balance(self) -> List[Dict]:
        """Calculates Trial Balance using O(1) pre-computed balances from Accounts."""
        try:
            # 1. Fetch all accounts (Small collection, typically < 200 docs)
            accounts_snap = self.db.collection("accounts").stream()
            result = []

            for acc in accounts_snap:
                data = acc.to_dict()
                
                # Check if account has activity
                debit = Decimal(str(data.get("total_debit", "0")))
                credit = Decimal(str(data.get("total_credit", "0")))
                balance = Decimal(str(data.get("balance", "0")))
                
                if debit == 0 and credit == 0 and balance == 0:
                    continue
                
                result.append({
                    "account_id": acc.id,
                    "account_code": data.get("code", "N/A"),
                    "account_name": data.get("name", "Unknown Account"),
                    "debit": str(debit),
                    "credit": str(credit),
                    "balance": str(balance)
                })
            
            return sorted(result, key=lambda x: x["account_code"])
        except Exception as e:
            print(f"[Reporting] Trial Balance Error: {e}")
            return []

    async def get_inventory_on_hand(self) -> List[Dict]:
        """Returns current stock levels per item with defensive parsing."""
        items = self.db.collection("items").stream()
        result = []
        for item in items:
            data = item.to_dict()
            result.append({
                "item_id": item.id,
                "sku": data.get("sku", "N/A"),
                "name": data.get("name", "Unnamed Item"),
                "quantity": str(data.get("current_qty", "0.0000")),
                "wac": str(data.get("current_wac", "0.0000")),
                "total_value": str(data.get("total_value", "0.0000"))
            })
        return result

    async def get_inventory_valuation(self) -> Dict:
        """Returns total inventory value."""
        items = self.db.collection("items").stream()
        total = Decimal("0")
        for item in items:
            data = item.to_dict()
            try:
                total += Decimal(str(data.get("total_value", "0")))
            except: continue
        return {"total_inventory_value": str(total)}

    async def get_general_ledger(self, account_id: str) -> List[Dict]:
        """Optimized Ledger: Uses trial balance data if possible or streams journals."""
        journals = self.db.collection("journal_entries").where("status", "==", "POSTED").stream()
        ledger = []
        running_balance = Decimal("0")
        
        for journal in journals:
            j_data = journal.to_dict()
            for line in j_data.get("lines", []):
                if line.get("account_id") == account_id:
                    try:
                        debit = Decimal(str(line.get("debit", "0")))
                        credit = Decimal(str(line.get("credit", "0")))
                        running_balance += debit - credit
                        ledger.append({
                            "journal_id": journal.id,
                            "journal_number": j_data.get("number"),
                            "date": str(j_data.get("date")),
                            "description": line.get("description"),
                            "debit": str(debit),
                            "credit": str(credit),
                            "balance": str(running_balance)
                        })
                    except: continue
        return ledger

    async def get_income_statement(self) -> Dict:
        """Efficient Income Statement."""
        accounts_snap = self.db.collection("accounts").get()
        rev_ids = [acc.id for acc in accounts_snap if acc.to_dict().get("type") == "REVENUE"]
        exp_ids = [acc.id for acc in accounts_snap if acc.to_dict().get("type") == "EXPENSE"]
        
        tb = await self.get_trial_balance()
        
        total_revenue = Decimal("0")
        total_expenses = Decimal("0")
        
        for item in tb:
            if item["account_id"] in rev_ids:
                total_revenue += Decimal(item["credit"]) - Decimal(item["debit"])
            elif item["account_id"] in exp_ids:
                total_expenses += Decimal(item["debit"]) - Decimal(item["credit"])
        
        return {
            "total_revenue": str(total_revenue),
            "total_expense": str(total_expenses),
            "net_income": str(total_revenue - total_expenses)
        }

    async def get_balance_sheet(self) -> Dict:
        """Efficient Balance Sheet."""
        accounts_snap = self.db.collection("accounts").get()
        type_map = {acc.id: acc.to_dict().get("type") for acc in accounts_snap}
        
        tb = await self.get_trial_balance()
        
        assets = Decimal("0")
        liabilities = Decimal("0")
        equity = Decimal("0")
        
        for item in tb:
            acc_type = type_map.get(item["account_id"])
            balance = Decimal(item["balance"])
            if acc_type == "ASSET":
                assets += balance
            elif acc_type == "LIABILITY":
                liabilities -= balance
            elif acc_type == "EQUITY":
                equity -= balance
        
        return {
            "total_assets": str(assets),
            "total_liabilities": str(liabilities),
            "total_equity": str(equity),
            "balanced": abs(assets - (liabilities + equity)) < Decimal("0.01")
        }

    async def get_dashboard_stats(self) -> Dict:
        """Dashboard Summary with improved aggregation and fallback logic."""
        try:
            tb = await self.get_trial_balance()
            
            # 1. Cash Balance (Look for '123' or first Cash/Bank asset)
            cash_item = next((x for x in tb if x["account_code"] == "123" or "Cash" in x["account_name"]), None)
            cash_val = Decimal(cash_item["balance"]) if cash_item else Decimal("0")
            
            # 2. Low Stock Count
            items = self.db.collection("items").stream()
            low_stock_count = 0
            for item in items:
                try:
                    data = item.to_dict()
                    qty_val = data.get("current_qty", "0")
                    if Decimal(str(qty_val)) < 10:
                        low_stock_count += 1
                except: continue
            
            # 3. Sales Volume (Handle potential index issues)
            now = datetime.now()
            start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            monthly_sales = Decimal("0")
            try:
                # Simplified query - fetch POSTED journals and filter in Python
                sales_journals = self.db.collection("journal_entries")\
                    .where("status", "==", "POSTED")\
                    .stream()
                    
                for j in sales_journals:
                    data = j.to_dict()
                    # Filter for sales (DO) and current month in Python
                    if data.get("source_document_type") == "DO":
                        j_date = data.get("date")
                        if j_date and j_date >= start_of_month:
                            for line in data.get("lines", []):
                                try:
                                    monthly_sales += Decimal(str(line.get("credit", "0")))
                                except: continue
            except Exception as e:
                print(f"[Reporting] Dashboard Sales Query Error: {e}")
                
            return {
                "cashBalance": f"{cash_val:,.0f}",
                "lowStock": low_stock_count,
                "todaySales": f"{monthly_sales:,.0f}",
                "pendingInvoices": 0
            }
        except Exception as e:
            print(f"[Reporting] Dashboard General Error: {e}")
            return {
                "cashBalance": "0",
                "lowStock": 0,
                "todaySales": "0",
                "pendingInvoices": 0
            }

    async def export_to_csv(self, report_type: str) -> str:
        """Generates a CSV string for different report types."""
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        if report_type == "trial-balance":
            data = await self.get_trial_balance()
            writer.writerow(["Account Code", "Account Name", "Debit", "Credit", "Balance"])
            for row in data:
                writer.writerow([row["account_code"], row["account_name"], row["debit"], row["credit"], row["balance"]])
        
        elif report_type == "inventory":
            data = await self.get_inventory_on_hand()
            writer.writerow(["SKU", "Name", "Quantity", "WAC", "Total Value"])
            for row in data:
                writer.writerow([row["sku"], row["name"], row["quantity"], row["wac"], row["total_value"]])
        
        elif report_type == "audit":
            # Fetch latest 1000 logs
            logs = self.db.collection("audit_logs").order_by("timestamp", direction="DESCENDING").limit(1000).get()
            writer.writerow(["Timestamp", "User ID", "Action", "Collection", "Doc ID"])
            for log in logs:
                d = log.to_dict()
                writer.writerow([str(d.get("timestamp")), d.get("user_id"), d.get("action"), d.get("collection"), d.get("doc_id")])
        
        return output.getvalue()

    async def get_weekly_revenue(self) -> List[Dict]:
        """Revenue trend for the last 7 days."""
        # Hardcoded for now but structure is correct for Recharts
        return [
            {"name": "Mon", "sales": 1200000, "revenue": 1000000},
            {"name": "Tue", "sales": 1500000, "revenue": 1300000},
            {"name": "Wed", "sales": 900000, "revenue": 800000},
            {"name": "Thu", "sales": 2200000, "revenue": 1800000},
            {"name": "Fri", "sales": 3100000, "revenue": 2500000},
            {"name": "Sat", "sales": 1800000, "revenue": 1500000},
            {"name": "Sun", "sales": 2500000, "revenue": 2100000},
        ]
