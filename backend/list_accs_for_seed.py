from app.core.firebase import get_db

def list_accounts():
    db = get_db()
    accs = db.collection('accounts').where('company_id', '==', 'OPENGATE_CORP').stream()
    for a in accs:
        d = a.to_dict()
        print(f"{d.get('code')} : {d.get('name_en')}")

if __name__ == "__main__":
    list_accounts()
