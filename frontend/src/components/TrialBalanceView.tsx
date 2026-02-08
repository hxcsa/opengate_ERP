"use client";

import { useEffect, useState } from "react";
import { X, PieChart, Download, ArrowDownUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TrialBalanceViewProps {
    onClose: () => void;
}

export default function TrialBalanceView({ onClose }: TrialBalanceViewProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

    useEffect(() => {
        fetch("/api/reports/trial-balance")
            .then(res => res.json())
            .then(d => {
                if (Array.isArray(d)) setData(d);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const totals = data.reduce((acc, curr) => {
        acc.debit += Number(curr.debit) || 0;
        acc.credit += Number(curr.credit) || 0;
        return acc;
    }, { debit: 0, credit: 0 });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-in zoom-in duration-200 overflow-hidden">
                <div className="p-6 bg-emerald-600 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <PieChart size={20} />
                        <div>
                            <h3 className="text-lg font-bold">{t("trialBalanceReport")}</h3>
                            <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">DETAILED BALANCES</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Export PDF"><Download size={20} /></button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 font-bold">
                            <ArrowDownUp className="animate-bounce" size={48} />
                            <p>{t("loading")}</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    <th className="px-6 py-4">{t("accountCode")}</th>
                                    <th className="px-6 py-4">{t("accountName")}</th>
                                    <th className="px-6 py-4 text-right">{t("debit")}</th>
                                    <th className="px-6 py-4 text-right">{t("credit")}</th>
                                    <th className="px-6 py-4 text-right">{t("balance")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.map((row) => (
                                    <tr key={row.account_id} className="hover:bg-slate-50 transition-all group">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-400 group-hover:text-blue-600 font-bold">{row.account_code}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{row.account_name}</td>
                                        <td className="px-6 py-4 text-right font-mono text-xs text-emerald-600 font-black">
                                            {Number(row.debit) > 0 ? Number(row.debit).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-xs text-rose-600 font-black">
                                            {Number(row.credit) > 0 ? Number(row.credit).toLocaleString() : '-'}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-mono text-sm font-black tabular-nums ${Number(row.balance) >= 0 ? 'text-slate-800' : 'text-rose-700'}`}>
                                            {Number(row.balance).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-900 text-white sticky bottom-0 font-black tabular-nums text-sm">
                                <tr>
                                    <td colSpan={2} className="px-6 py-4 uppercase tracking-widest">Grand Totals</td>
                                    <td className="px-6 py-4 text-right text-emerald-400">{totals.debit.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-rose-400">{totals.credit.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-blue-400">0</td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
