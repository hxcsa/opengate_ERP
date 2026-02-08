import { useState, useEffect } from "react";
import { X, Save, Plus, Trash2, Calculator, Calendar } from "lucide-react";

interface JournalFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function JournalForm({ onClose, onSuccess }: JournalFormProps) {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        number: `JE-${Date.now().toString().slice(-6)}`,
        description: "",
        lines: [
            { account_id: "", debit: "0", credit: "0", description: "" },
            { account_id: "", debit: "0", credit: "0", description: "" },
        ]
    });

    useEffect(() => {
        fetch("/api/accounts?limit=500")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setAccounts(data);
            });
    }, []);

    const addLine = () => {
        setFormData({
            ...formData,
            lines: [...formData.lines, { account_id: "", debit: "0", credit: "0", description: "" }]
        });
    };

    const removeLine = (index: number) => {
        if (formData.lines.length <= 2) return;
        const newLines = formData.lines.filter((_, i) => i !== index);
        setFormData({ ...formData, lines: newLines });
    };

    const updateLine = (index: number, field: string, value: string) => {
        const newLines = [...formData.lines];
        (newLines[index] as any)[field] = value;
        setFormData({ ...formData, lines: newLines });
    };

    const totalDebit = formData.lines.reduce((sum, l) => sum + parseFloat(l.debit || "0"), 0);
    const totalCredit = formData.lines.reduce((sum, l) => sum + parseFloat(l.credit || "0"), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.0001;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isBalanced) {
            alert("Journal entries must balance (Total Debit = Total Credit)");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/accounting/journal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const err = await res.json();
                alert(`Failed: ${err.detail || "Unknown error"}`);
            }
        } catch (err) {
            console.error(err);
            alert("Error connection to API");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 bg-[#0f172a] text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-600 p-2 rounded-lg">
                            <Calculator size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Manual Journal Entry / قيد يدوي</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Financial Department</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-[#f8fafc]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Calendar size={14} /> Entry Number / رقم القيد
                            </label>
                            <input
                                required
                                className="form-input font-mono font-bold"
                                value={formData.number}
                                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase">
                                Overall Description / الوصف
                            </label>
                            <input
                                required
                                className="form-input font-bold"
                                placeholder="Ex: Monthly Rent Payment"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Entry Lines / أسطر القيد</h4>
                            <button
                                type="button"
                                onClick={addLine}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                <Plus size={14} /> Add Line / إضافة سطر
                            </button>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="text-left p-3 font-bold text-slate-500 uppercase text-[10px]">Account / الحساب</th>
                                        <th className="text-left p-3 font-bold text-slate-500 uppercase text-[10px]">Description</th>
                                        <th className="text-right p-3 font-bold text-slate-500 uppercase text-[10px] w-32">Debit</th>
                                        <th className="text-right p-3 font-bold text-slate-500 uppercase text-[10px] w-32">Credit</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.lines.map((line, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 last:border-none">
                                            <td className="p-2">
                                                <select
                                                    required
                                                    className="w-full p-2 bg-slate-50 border border-transparent focus:border-blue-500 rounded-lg font-mono text-xs outline-none"
                                                    value={line.account_id}
                                                    onChange={(e) => updateLine(idx, 'account_id', e.target.value)}
                                                >
                                                    <option value="">Select Account...</option>
                                                    {accounts.map(acc => (
                                                        <option key={acc.id} value={acc.id}>
                                                            {acc.code} - {acc.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    className="w-full p-2 bg-transparent focus:bg-slate-50 rounded-lg outline-none"
                                                    placeholder="Line details..."
                                                    value={line.description}
                                                    onChange={(e) => updateLine(idx, 'description', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    className="w-full p-2 bg-emerald-50/30 border border-transparent focus:border-emerald-500 rounded-lg font-bold text-emerald-700 outline-none text-right"
                                                    value={line.debit}
                                                    onChange={(e) => updateLine(idx, 'debit', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    className="w-full p-2 bg-rose-50/30 border border-transparent focus:border-rose-500 rounded-lg font-bold text-rose-700 outline-none text-right"
                                                    value={line.credit}
                                                    onChange={(e) => updateLine(idx, 'credit', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeLine(idx)}
                                                    className="text-slate-300 hover:text-rose-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-900 text-white font-bold">
                                    <tr>
                                        <td colSpan={2} className="p-4 text-xs tracking-widest uppercase">Totals / الإجمالي</td>
                                        <td className="p-4 text-right tabular-nums">{totalDebit.toLocaleString()}</td>
                                        <td className="p-4 text-right tabular-nums">{totalCredit.toLocaleString()}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {!isBalanced && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-bold">
                            <X size={16} />
                            <span>Entry is out of balance by {Math.abs(totalDebit - totalCredit).toLocaleString()} IQD. Debits must equal Credits.</span>
                        </div>
                    )}

                    <div className="pt-4 flex gap-4">
                        <button
                            type="submit"
                            disabled={loading || !isBalanced}
                            className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none"
                        >
                            <Save size={20} />
                            {loading ? "Posting..." : "Post Journal Entry / ترحيل القيد"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-black hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
