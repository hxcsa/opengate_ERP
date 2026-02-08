from app.core.firebase import get_db
from app.models.core import DocumentStatus
from app.schemas.erp import JournalEntryCreate
from .posting import PostingEngine
from google.cloud import firestore

class AccountingService:
    def __init__(self):
        self.db = get_db()
        self.posting_engine = PostingEngine()

    def create_journal_entry(self, data: JournalEntryCreate):
        """Creates and posts a journal entry synchronously."""
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _execute(transaction, db, posting_engine, data):
            je_ref = db.collection("journal_entries").document()
            
            lines_data = []
            for line in data.lines:
                lines_data.append({
                    "account_id": line.account_id,
                    "debit": str(line.debit),
                    "credit": str(line.credit),
                    "description": line.description
                })

            transaction.set(je_ref, {
                "number": data.number,
                "date": firestore.SERVER_TIMESTAMP,
                "description": data.description,
                "status": "DRAFT",
                "lines": lines_data
            })

            posting_engine.post_journal_entry(transaction, je_ref.id)
            return je_ref.id

        return _execute(transaction, self.db, self.posting_engine, data)
