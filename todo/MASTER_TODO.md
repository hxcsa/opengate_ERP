# MASTER TODO — INVENTORY & FINANCE SYSTEM (LITE ERP)

## PHASE 1 — FOUNDATION & FIREBASE
- [x] Firebase Project Setup (Console)
- [x] Service Account Configuration
- [x] Firebase Auth Integration
- [x] Audit log middleware (Firestore based)

## PHASE 2 — ACCOUNTING CORE (FIRESTORE)
- [x] Chart of Accounts (Firestore nested structure)
- [x] Seed Iraqi Unified COA
- [x] Journal Entry Collections & Schemas
- [x] Posting engine (Firestore Transactions)
- [x] Trial Balance report

## PHASE 3 — INVENTORY CORE (FIRESTORE)
- [x] Items & Warehouses Collections
- [x] Stock Ledger (Movements)
- [x] WAC calculation logic (Firebase backend)
- [x] Goods Receipt (GRN)
- [x] Delivery Note (DO)

## PHASE 4 — INTEGRATION
- [x] Purchase → Inventory + Journal
- [x] Sale → Inventory + Revenue + COGS
- [x] Returns logic
- [x] Transfer logic

## PHASE 5 — REPORTING
- [x] Inventory on hand
- [x] Inventory valuation
- [x] General ledger
- [x] Income statement
- [x] Balance sheet
- [ ] PDF & Excel export

## PHASE 6 — FRONTEND
- [x] Login
- [x] Dashboard
- [x] Inventory screens
- [x] Accounting screens
- [ ] Printable invoices
- [x] RTL Arabic support

## PHASE 7 — HARDENING
- [ ] Pagination
- [ ] Indexes
- [ ] Rate limiting
- [ ] Backup instructions

## PHASE 8 — OPTIONAL AI
- [ ] Reorder suggestions
- [ ] Anomaly detection
