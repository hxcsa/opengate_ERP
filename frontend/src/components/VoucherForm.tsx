"use client";

import { useState, useEffect } from "react";
import { X, Save, Receipt, CreditCard, Landmark, Coins } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Account } from "@/app/accounting/types";
import { fetchWithAuth } from "@/lib/api";

interface VoucherFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialType?: 'PAYMENT' | 'RECEIPT';
}

export default function VoucherForm({ onClose, onSuccess, initialType = 'PAYMENT' }: VoucherFormProps) {
    const [type, setType] = useState(initialType);
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const { t, locale } = useLanguage();

    const [form, setForm] = useState<any>({
        voucher_number: `V-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().split('T')[0],
        amount: "",
        currency: "IQD",
        cash_bank_account_id: "",
        expense_account_id: "", // For Payment
        customer_id: "", // For Receipt
        supplier_id: "", // For Payment
        payee: "",
        description: "",
        payment_method: "CASH",
        linked_invoices: [],
        linked_bills: []
    });

    const [outstandings, setOutstandings] = useState<any[]>([]);

    useEffect(() => {
        // Fetch accounts for select
        fetchWithAuth("/api/accounts")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setAccounts(data);
            });

        // Fetch partners
        fetchWithAuth("/api/customers")
            .then(res => res.json())
            .then(data => {
                // Backend returns { customers: [], total_count: 0 }
                const list = data.customers || (Array.isArray(data) ? data : []);
                setCustomers(list);
            });

        // Fetch suppliers for payments
        fetchWithAuth("/api/suppliers")
            .then(res => res.json())
            .then(data => {
                // If api doesn't exist yet, we'll handle it or create it
            }).catch(() => { });

    }, []);

    useEffect(() => {
        const partnerId = type === 'RECEIPT' ? form.customer_id : form.supplier_id;
        if (!partnerId) {
            setOutstandings([]);
            return;
        }

        const endpoint = type === 'RECEIPT'
            ? `/api/sales/invoices?customer_id=${partnerId}&status=ISSUED`
            : `/api/purchasing/bills?supplier_id=${partnerId}&status=POSTED`;

        fetchWithAuth(endpoint)
            .then(res => res.json())
            .then(data => {
                const list = data.invoices || data.bills || [];
                setOutstandings(list);
            }).catch(() => { });
    }, [form.customer_id, form.supplier_id, type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const endpoint = type === 'PAYMENT'
            ? "/api/accounting/vouchers/payment"
            : "/api/accounting/vouchers/receipt";

        try {
            const res = await fetchWithAuth(endpoint, {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`Error: ${err.detail || 'Failed to save voucher'}`);
            }
        } catch (error) {
            console.error("Voucher submission error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in zoom-in duration-200">
                <div className="p-6 bg-[#0f172a] text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-xl">
                            {type === 'PAYMENT' ? <CreditCard size={24} /> : <Receipt size={24} />}
                        </div>
                        <div>
                            <h3 className="text-xl font-black">
                                {type === 'PAYMENT' ? (locale === 'ar' ? 'سند صرف' : 'Payment Voucher') : (locale === 'ar' ? 'سند قبض' : 'Receipt Voucher')}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Treasury & Cash Ops</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-auto max-h-[70vh]">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase">Voucher #</label>
                            <input
                                required
                                value={form.voucher_number}
                                onChange={e => setForm({ ...form, voucher_number: e.target.value })}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-blue-500/20 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase">Date</label>
                            <input
                                type="date"
                                required
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-blue-500/20 transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase">Amount</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    required
                                    placeholder="0.00"
                                    value={form.amount}
                                    onChange={e => setForm({ ...form, amount: e.target.value })}
                                    className="w-full bg-blue-50/50 text-blue-900 border-none rounded-2xl p-4 pl-12 font-black text-xl focus:ring-2 ring-blue-500/20 transition-all"
                                />
                                <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={20} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase">Currency</label>
                            <select
                                value={form.currency}
                                onChange={e => setForm({ ...form, currency: e.target.value })}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-blue-500/20 appearance-none"
                            >
                                <option value="IQD">IQD - Iraqi Dinar</option>
                                <option value="USD">USD - US Dollar</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase">
                            {type === 'PAYMENT' ? (locale === 'ar' ? 'الصندوق / المصرف' : 'Source (Cash/Bank)') : (locale === 'ar' ? 'الإيداع في' : 'Deposit To')}
                        </label>
                        <select
                            required
                            value={form.cash_bank_account_id}
                            onChange={e => setForm({ ...form, cash_bank_account_id: e.target.value })}
                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-blue-500/20"
                        >
                            <option value="">Select Account...</option>
                            {accounts.filter(a => !a.is_group && (a.code.startsWith('123') || a.type === 'ASSET')).map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.code} - {locale === 'ar' ? acc.name_ar : acc.name_en}
                                </option>
                            ))}
                        </select>
                    </div>

                    {type === 'PAYMENT' ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase">Account / Category</label>
                                <select
                                    required
                                    value={form.expense_account_id}
                                    onChange={e => setForm({ ...form, expense_account_id: e.target.value })}
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-blue-500/20"
                                >
                                    <option value="">Select Expense/Liability Account...</option>
                                    {accounts.filter(a => !a.is_group).map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.code} - {locale === 'ar' ? acc.name_ar : acc.name_en}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase">Payee / Name</label>
                                <input
                                    placeholder="Enter recipient name..."
                                    value={form.payee}
                                    onChange={e => setForm({ ...form, payee: e.target.value })}
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-blue-500/20"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase">Customer</label>
                            <select
                                required
                                value={form.customer_id}
                                onChange={e => setForm({ ...form, customer_id: e.target.value })}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-blue-500/20"
                            >
                                <option value="">Select Customer...</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {outstandings.length > 0 && (
                        <div className="space-y-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                            <label className="text-xs font-black text-indigo-400 uppercase flex justify-between">
                                <span>{type === 'RECEIPT' ? 'Settle Invoices' : 'Settle Bills'}</span>
                                <span>{locale === 'ar' ? 'تسوية الفواتير' : ''}</span>
                            </label>
                            <div className="space-y-2 max-h-40 overflow-auto">
                                {outstandings.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-indigo-50 shadow-sm">
                                        <div className="text-xs font-bold">
                                            <p className="text-slate-900">{doc.invoice_number || doc.bill_number}</p>
                                            <p className="text-slate-400">{doc.due_date?.split('T')[0] || 'No date'}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black tabular-nums text-slate-500">
                                                {Number(doc.remaining_amount).toLocaleString()}
                                            </span>
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                onChange={(e) => {
                                                    const isChecked = e.target.checked;
                                                    const field = type === 'RECEIPT' ? 'linked_invoices' : 'linked_bills';
                                                    if (isChecked) {
                                                        setForm({
                                                            ...form,
                                                            [field]: [...form[field], { invoice_id: doc.id, amount: doc.remaining_amount }]
                                                        });
                                                    } else {
                                                        setForm({
                                                            ...form,
                                                            [field]: form[field].filter((f: any) => f.invoice_id !== doc.id)
                                                        });
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase">Notes / Description</label>
                        <textarea
                            rows={3}
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-blue-500/20 resize-none"
                            placeholder="Transactional memo..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-lg flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                        {loading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : <Save size={24} />}
                        {type === 'PAYMENT' ? (locale === 'ar' ? 'حفظ سند الصرف' : 'Save Payment') : (locale === 'ar' ? 'حفظ سند القبض' : 'Save Receipt')}
                    </button>
                </form>
            </div>
        </div>
    );
}
