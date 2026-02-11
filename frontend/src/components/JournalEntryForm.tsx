"use client";

import { useState, useEffect } from "react";
import { X, Save, Plus, Trash2, BookOpen, Calculator, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchWithAuth } from "@/lib/api";

interface JournalEntryFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function JournalEntryForm({ onClose, onSuccess }: JournalEntryFormProps) {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const { t, locale } = useLanguage();
    const [formData, setFormData] = useState({
        number: `JE-${new Date().getTime().toString().slice(-6)}`,
        date: new Date().toISOString().split('T')[0],
        description: "",
        lines: [
            { account_id: "", debit: "0", credit: "0", memo: "" },
            { account_id: "", debit: "0", credit: "0", memo: "" }
        ]
    });

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const res = await fetchWithAuth("/api/accounts");
                const data = await res.json();
                const list = data.accounts || (Array.isArray(data) ? data : []);
                setAccounts(list.filter((a: any) => !a.is_group));
            } catch (err) {
                console.error("Fetch accounts error:", err);
            }
        };
        fetchAccounts();
    }, []);

    const addLine = () => {
        setFormData({
            ...formData,
            lines: [...formData.lines, { account_id: "", debit: "0", credit: "0", memo: "" }]
        });
    };

    const removeLine = (index: number) => {
        if (formData.lines.length <= 2) return; // Keep at least 2 lines
        setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== index) });
    };

    const updateLine = (index: number, field: string, value: string) => {
        const newLines = [...formData.lines];
        (newLines[index] as any)[field] = value;
        setFormData({ ...formData, lines: newLines });
    };

    const totals = formData.lines.reduce((acc, line) => ({
        debit: acc.debit + Number(line.debit || 0),
        credit: acc.credit + Number(line.credit || 0)
    }), { debit: 0, credit: 0 });

    const difference = Math.abs(totals.debit - totals.credit);
    const isBalanced = difference < 0.001 && totals.debit > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isBalanced) {
            alert(locale === 'ar' ? "القيد غير متوازن!" : "Journal entry is not balanced!");
            return;
        }

        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/accounting/journal", {
                method: "POST",
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                onSuccess();
                // onClose(); // Let parent handle closing via onSuccess to avoid double state updates
            } else {
                const err = await res.json();
                let errMsg = "Failed to create journal entry";
                if (typeof err.detail === 'string') {
                    errMsg = err.detail;
                } else if (Array.isArray(err.detail)) {
                    errMsg = err.detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join('\n');
                } else if (err.detail) {
                    errMsg = JSON.stringify(err.detail);
                }
                alert(errMsg);
            }
        } catch (err) {
            alert("Connection error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in duration-300 border border-white/20">
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-indigo-600 to-blue-700 text-white flex justify-between items-center shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-inner">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black">{locale === 'ar' ? "قيد يومي جديد" : "New Daily Journal Entry"}</h3>
                            <p className="text-[10px] opacity-80 font-black uppercase tracking-widest leading-none mt-1">Double Entry System</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-slate-50/50 max-h-[85vh] overflow-y-auto">
                    {/* Top Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Reference Number</label>
                            <input
                                required
                                className="w-full bg-white border border-slate-200 p-4 rounded-xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                value={formData.number}
                                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Entry Date</label>
                            <input
                                type="date"
                                required
                                className="w-full bg-white border border-slate-200 p-4 rounded-xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Description / Memo</label>
                            <input
                                required
                                className="w-full bg-white border border-slate-200 p-4 rounded-xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                placeholder="General description..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Lines Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Lines</h4>
                            <button type="button" onClick={addLine} className="text-xs font-black text-indigo-600 flex items-center gap-2 hover:bg-white px-3 py-1.5 rounded-lg transition-all border border-indigo-100 shadow-sm">
                                <Plus size={14} /> Add Line
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 overflow-hidden">
                            {formData.lines.map((line, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end transition-all hover:border-indigo-200 hover:shadow-md group">
                                    <div className="flex-1 space-y-1.5 w-full">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Account</label>
                                        <select
                                            required
                                            className="w-full p-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            value={line.account_id}
                                            onChange={(e) => updateLine(idx, 'account_id', e.target.value)}
                                        >
                                            <option value="">Select Account...</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.code} - {locale === 'ar' ? acc.name_ar : acc.name_en}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-full md:w-32 space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Debit</label>
                                        <input
                                            type="number"
                                            step="any"
                                            className="w-full p-3.5 bg-emerald-50/30 border-none rounded-xl font-black text-right outline-none text-emerald-700 tabular-nums focus:ring-2 focus:ring-emerald-500/20"
                                            value={line.debit}
                                            onChange={(e) => updateLine(idx, 'debit', e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </div>
                                    <div className="w-full md:w-32 space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Credit</label>
                                        <input
                                            type="number"
                                            step="any"
                                            className="w-full p-3.5 bg-rose-50/30 border-none rounded-xl font-black text-right outline-none text-rose-700 tabular-nums focus:ring-2 focus:ring-rose-500/20"
                                            value={line.credit}
                                            onChange={(e) => updateLine(idx, 'credit', e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1.5 w-full hidden lg:block">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Line Memo</label>
                                        <input
                                            className="w-full p-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            placeholder="Line memo..."
                                            value={line.memo}
                                            onChange={(e) => updateLine(idx, 'memo', e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeLine(idx)}
                                        className="mb-1 p-3.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <div className={`flex items-center gap-3 p-5 rounded-2xl border-2 transition-all ${isBalanced ? 'bg-emerald-50 border-emerald-100 text-emerald-800 shadow-emerald-500/10' : 'bg-rose-50 border-rose-100 text-rose-700 shadow-rose-500/10'}`}>
                            {isBalanced ? <Save size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-rose-400" />}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</p>
                                <p className="text-sm font-black">{isBalanced ? "Balanced & Ready" : "Unbalanced"}</p>
                            </div>
                            {!isBalanced && totals.debit > 0 && (
                                <div className="ml-auto text-right">
                                    <p className="text-[10px] font-black opacity-40">Difference</p>
                                    <p className="text-sm font-black">{difference.toLocaleString()}</p>
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-2 grid grid-cols-2 gap-4">
                            <div className="bg-slate-900 rounded-2xl p-4 flex flex-col justify-center text-white shadow-xl">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Debit</span>
                                <span className="text-xl font-black tabular-nums text-emerald-400">{totals.debit.toLocaleString()}</span>
                            </div>
                            <div className="bg-slate-900 rounded-2xl p-4 flex flex-col justify-center text-white shadow-xl">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Credit</span>
                                <span className="text-xl font-black tabular-nums text-rose-400">{totals.credit.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !isBalanced}
                        className={`w-full py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all text-lg shadow-2xl ${isBalanced && !loading ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1 shadow-indigo-500/30' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                        {loading ? <Calculator className="animate-spin" size={24} /> : <Save size={24} />}
                        {loading ? "Processing..." : (locale === 'ar' ? "ترحيل القيد" : "Post Journal Entry")}
                    </button>
                    <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">Automated Integrity Check System</p>
                </form>
            </div>
        </div>
    );
}
