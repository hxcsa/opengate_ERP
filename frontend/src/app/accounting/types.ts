/**
 * Accounting Module TypeScript Definitions
 */

export enum AccountType {
    ASSET = "ASSET",
    LIABILITY = "LIABILITY",
    EQUITY = "EQUITY",
    REVENUE = "REVENUE",
    EXPENSE = "EXPENSE",
}

export enum DocumentStatus {
    DRAFT = "DRAFT",
    POSTED = "POSTED",
    VOIDED = "VOIDED",
}

export enum PaymentMethod {
    CASH = "CASH",
    BANK = "BANK",
    CHECK = "CHECK",
}

export interface Account {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    type: AccountType;
    parent_id?: string;
    is_group: boolean;
    is_reconcilable: boolean;
    currency: string;
    total_debit: string;
    total_credit: string;
    balance: string;
    active: boolean;
    company_id: string;
    subledger_type?: string;
}

export interface JournalLine {
    account_id: string;
    debit: string;
    credit: string;
    memo?: string;
    cost_center_id?: string;
}

export interface JournalEntry {
    id: string;
    number: string;
    date: string;
    description?: string;
    status: DocumentStatus;
    lines: JournalLine[];
    attachments: string[];
    company_id: string;
    created_by: string;
}

export interface Voucher {
    id: string;
    type: "PAYMENT" | "RECEIPT" | "CREDIT_NOTE";
    number: string;
    date: string;
    amount: string;
    currency: string;
    payment_method: PaymentMethod;
    journal_id?: string;
    company_id: string;
}

export interface TrialBalanceItem {
    account_id: string;
    account_code: string;
    account_name_ar: string;
    account_name_en: string;
    debit: string;
    credit: string;
    balance: string;
}

export interface TrialBalance {
    items: TrialBalanceItem[];
    total_debit: string;
    total_credit: string;
    difference: string;
    is_balanced: boolean;
}

export interface AgingItem {
    partner_id: string;
    partner_name: string;
    total: string;
    current: string;
    d30: string;
    d60: string;
    d90: string;
    over90: string;
}

export interface ReconciliationData {
    subledger_total: string;
    control_account_balance: string;
    difference: string;
    is_reconciled: boolean;
}
