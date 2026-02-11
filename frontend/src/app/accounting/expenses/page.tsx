"use client";

import { useState, useEffect } from "react";
import { Plus, ArrowLeft, Receipt, Briefcase, DollarSign } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);

    // Filtered lists for dropdowns
    const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]); // Type = EXPENSE
    const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]); // Type = ASSET (Cash/Bank)

    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
        expense_account_id: "",
        payment_account_id: "",
        reference: "",
        vendor: "",
        notes: ""
    });

    useEffect(() => {
        fetchExpenses();
        fetchAccounts();
    }, []);

    const fetchExpenses = async () => {
        try {
            const res = await fetchWithAuth("/api/expenses");
            if (res.ok) {
                const data = await res.json();
                const list = data.expenses || (Array.isArray(data) ? data : []);
                setExpenses(list);
            } else {
                const errBody = await res.text();
                console.error(`[Expenses] Fetch failed: ${res.status} - ${errBody}`);
            }
        } catch (e) {
            console.error("[Expenses] Fetch exception:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccounts = async () => {
        const res = await fetchWithAuth("/api/accounting/accounts");
        if (res.ok) {
            const data = await res.json();
            const list = data.accounts || (Array.isArray(data) ? data : []);
            setAccounts(list);
            // Pre-filter
            setExpenseAccounts(list.filter((a: any) => a.type === "EXPENSE"));
            setPaymentAccounts(list.filter((a: any) => a.type === "ASSET" || a.type === "BANK" || a.type === "CASH"));
        }
    };

    const handleSubmit = async () => {
        if (!formData.amount || !formData.expense_account_id || !formData.payment_account_id) {
            alert("Please fill required fields (Amount, Accounts)");
            return;
        }

        try {
            const res = await fetchWithAuth("/api/expenses", {
                method: "POST",
                body: JSON.stringify({
                    ...formData,
                    amount: parseFloat(formData.amount)
                })
            });

            if (res.ok) {
                setShowModal(false);
                fetchExpenses();
                setFormData({
                    description: "",
                    amount: "",
                    date: new Date().toISOString().split('T')[0],
                    expense_account_id: "",
                    payment_account_id: "",
                    reference: "",
                    vendor: "",
                    notes: ""
                });
            } else {
                const err = await res.json();
                alert("Error creating expense: " + (err.detail || "Unknown error"));
            }
        } catch (e) {
            alert("Failed to create expense");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-rose-600 shadow-xl shadow-rose-200 rounded-3xl text-white transform -rotate-3">
                        <Briefcase size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Expenses</h1>
                        <p className="text-slate-500 font-medium">Track operational costs and payments</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center gap-2"
                >
                    <Plus size={20} />
                    Record Expense
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Number</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Description</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Vendor</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading...</td></tr>
                        ) : expenses.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No expenses found.</td></tr>
                        ) : (
                            expenses.map(ex => (
                                <tr key={ex.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700 font-mono">{ex.number}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(ex.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{ex.description}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{ex.vendor || "-"}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900 font-mono text-right">
                                        {Number(ex.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-slate-900">Record Expense</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <ArrowLeft size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 border-none p-4 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 border-none p-4 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500"
                                            placeholder="0.00"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        />
                                        {formData.amount && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm pointer-events-none">
                                                {Number(formData.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500"
                                    placeholder="e.g. Office Supplies"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vendor (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500"
                                    placeholder="e.g. Amazon"
                                    value={formData.vendor}
                                    onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expense Account (Debit)</label>
                                <select
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500"
                                    value={formData.expense_account_id}
                                    onChange={e => setFormData({ ...formData, expense_account_id: e.target.value })}
                                >
                                    <option value="">Select Category...</option>
                                    {expenseAccounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.code} - {a.name_en}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Paid From (Credit)</label>
                                <select
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500"
                                    value={formData.payment_account_id}
                                    onChange={e => setFormData({ ...formData, payment_account_id: e.target.value })}
                                >
                                    <option value="">Select Payment Acct...</option>
                                    {paymentAccounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.code} - {a.name_en}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Internal Note</label>
                                <textarea
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 h-24 resize-none"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transform transition-all active:scale-95"
                            >
                                Record Expense
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
