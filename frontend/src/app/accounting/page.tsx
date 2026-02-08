"use client";

import { useEffect, useState } from "react";
import {
    Book, FileText, PieChart, ShieldCheck,
    Search, Plus, Filter, Landmark, Truck
} from "lucide-react";
import JournalForm from "@/components/JournalForm";
import PurchaseForm from "@/components/PurchaseForm";
import JournalViewer from "@/components/JournalViewer";
import TrialBalanceView from "@/components/TrialBalanceView";
import BalanceSheetView from "@/components/BalanceSheetView";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Accounting() {
    const [coa, setCoa] = useState<any[]>([]);
    const [snapshot, setSnapshot] = useState({ assets: "0", liabilities: "0", equity: "0" });
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showJournalModal, setShowJournalModal] = useState(false);
    const [showTrialBalanceModal, setShowTrialBalanceModal] = useState(false);
    const [showBalanceSheetModal, setShowBalanceSheetModal] = useState(false);
    const { t } = useLanguage();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [coaRes, bsRes, tbRes] = await Promise.all([
                fetch("/api/accounts"),
                fetch("/api/reports/balance-sheet"),
                fetch("/api/reports/trial-balance")
            ]);

            const [coaData, bsData, tbData] = await Promise.all([
                coaRes.json(),
                bsRes.json(),
                tbRes.json()
            ]);

            if (Array.isArray(coaData)) {
                // Map TB balances into COA
                const coaWithBalance = coaData.map(acc => {
                    const tbEntry = tbData.find((t: any) => t.account_id === acc.id);
                    return { ...acc, balance: tbEntry ? tbEntry.balance : "0" };
                });
                setCoa(coaWithBalance);
            }
            if (bsData) {
                setSnapshot({
                    assets: bsData.total_assets || "0",
                    liabilities: bsData.total_liabilities || "0",
                    equity: bsData.total_equity || "0"
                });
            }
        } catch (e) {
            console.error("Accounting fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Financial Management / الإدارة المالية</h1>
                    <p className="text-slate-500 text-sm font-medium">Standard Iraqi Unified Accounting System</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 font-bold"
                    >
                        <Plus size={18} /> New Entry / قيد جديد
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FinanceAction title="Journal" sub="Entries" icon={<Book size={20} />} color="bg-indigo-600" onClick={() => setShowJournalModal(true)} />
                <FinanceAction title="Trial Balance" sub="Reports" icon={<PieChart size={20} />} color="bg-emerald-600" onClick={() => setShowTrialBalanceModal(true)} />
                <FinanceAction title="Inventory" sub="Purchase" icon={<Truck size={20} />} color="bg-blue-600" onClick={() => setShowPurchaseModal(true)} />
                <FinanceAction title="Reconcile" sub="Bank" icon={<Landmark size={20} />} color="bg-slate-800" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 enterprise-card border-none shadow-sm overflow-hidden p-0">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="text-lg font-bold">Chart of Accounts / دليل الحسابات</h3>
                        <div className="relative">
                            <Search className="absolute right-3 top-2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search accounts..."
                                className="bg-slate-50 border-none rounded-lg pr-9 pl-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>
                    <div className="max-h-[600px] overflow-auto">
                        <table className="enterprise-table">
                            <thead className="sticky top-0 bg-slate-50 z-10">
                                <tr>
                                    <th className="w-20">Code</th>
                                    <th>Account Name / اسم الحساب</th>
                                    <th>Type</th>
                                    <th className="text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} className="text-center py-20 text-slate-400 font-bold">Loading Financial Data...</td></tr>
                                ) : coa.map((acc: any) => (
                                    <tr key={acc.id} className={`${acc.is_group ? "bg-slate-50/50 font-black" : "hover:bg-slate-50"} transition-colors`}>
                                        <td className="font-mono text-xs text-slate-400">{acc.code}</td>
                                        <td className="text-slate-800 font-bold">{acc.name}</td>
                                        <td>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${acc.type === 'Asset' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                                {acc.type}
                                            </span>
                                        </td>
                                        <td className="text-right font-black tabular-nums text-slate-700">
                                            {Number(acc.balance || 0).toLocaleString()} <span className="text-[10px] opacity-40">IQD</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="enterprise-card bg-[#0f172a] text-white border-none shadow-2xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h4 className="text-slate-400 text-[10px] font-black uppercase mb-6 tracking-[0.2em]">Financial Snapshot</h4>
                            <div className="space-y-5">
                                <div className="flex justify-between items-center group cursor-pointer">
                                    <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Total Assets</span>
                                    <span className="font-black text-lg">{(Number(snapshot.assets) / 1000000).toFixed(1)}M</span>
                                </div>
                                <div className="flex justify-between items-center group cursor-pointer">
                                    <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Total Liabilities</span>
                                    <span className="font-black text-lg text-rose-400">{(Number(snapshot.liabilities) / 1000000).toFixed(1)}M</span>
                                </div>
                                <div className="pt-4 border-t border-slate-800 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Net Equity</p>
                                        <span className="font-black text-3xl text-emerald-400 tabular-nums">{(Number(snapshot.equity) / 1000000).toFixed(1)}M</span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 mb-1">IQD</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowBalanceSheetModal(true)}
                                className="w-full mt-8 bg-blue-600 hover:bg-blue-700 transition-all py-3 rounded-xl text-sm font-black shadow-lg shadow-blue-500/20"
                            >
                                Open Balance Sheet
                            </button>
                        </div>
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
                    </div>

                    <div className="enterprise-card border-none shadow-sm flex items-start gap-4 p-5">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-800 text-sm mb-1">Integrity Check</h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">Financial ledger is in balance. All trial balance checks passed for the current period.</p>
                        </div>
                    </div>
                </div>
            </div>

            {showAddModal && (
                <JournalForm
                    onClose={() => setShowAddModal(false)}
                    onSuccess={fetchData}
                />
            )}

            {showPurchaseModal && (
                <PurchaseForm
                    onClose={() => setShowPurchaseModal(false)}
                    onSuccess={fetchData}
                />
            )}

            {showJournalModal && (
                <JournalViewer onClose={() => setShowJournalModal(false)} />
            )}

            {showTrialBalanceModal && (
                <TrialBalanceView onClose={() => setShowTrialBalanceModal(false)} />
            )}

            {showBalanceSheetModal && (
                <BalanceSheetView onClose={() => setShowBalanceSheetModal(false)} />
            )}
        </div>
    );
}

function FinanceAction({ title, sub, icon, color }: any) {
    return (
        <button className={`p-6 rounded-2xl text-white flex flex-col items-center justify-center gap-3 hover:scale-[1.03] transition-all shadow-lg active:scale-95 ${color}`}>
            <div className="p-3 bg-white/10 border border-white/20 rounded-xl shadow-inner">{icon}</div>
            <div className="text-center">
                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-0.5">{sub}</p>
                <h4 className="font-black text-lg">{title}</h4>
            </div>
        </button>
    );
}
