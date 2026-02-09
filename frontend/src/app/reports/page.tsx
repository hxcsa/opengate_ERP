"use client";

import { useEffect, useState } from "react";
import {
    FileText, Download, Printer, Filter,
    TrendingUp, TrendingDown, Scale, PieChart,
    BarChart3, ArrowRight, History, Activity,
    FileDown, Box
} from "lucide-react";
import React, { useCallback, memo } from "react";

const ReportLine = memo(({ label, icon, value, negative }: any) => (
    <div className="flex justify-between items-center group">
        <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            <span className={`font-mono font-black tabular-nums ${negative ? 'text-rose-500' : 'text-slate-800'}`}>
                {negative ? '-' : ''}{value}
            </span>
            <span className="text-[10px] font-black text-slate-300">IQD</span>
        </div>
    </div>
));
ReportLine.displayName = "ReportLine";

const AuditRow = memo(({ log }: any) => (
    <tr className="hover:bg-slate-50 transition-colors">
        <td className="py-4 pr-4 font-mono text-[10px] text-slate-400">
            {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'N/A'}
        </td>
        <td className="py-4 px-4 text-center">
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-600' :
                log.action === 'VOID' ? 'bg-rose-50 text-rose-600' :
                    'bg-blue-50 text-blue-600'
                }`}>
                {log.action}
            </span>
        </td>
        <td className="py-4 px-4 font-bold text-xs text-slate-600">{log.collection}</td>
        <td className="py-4 px-4 text-xs font-medium text-slate-500">{log.user_id?.slice(0, 8)}...</td>
        <td className="py-4 px-4 text-xs font-bold text-slate-800 truncate max-w-[200px]">
            {log.doc_id}
        </td>
    </tr>
));
AuditRow.displayName = "AuditRow";

export default function Reports() {
    const [reports, setReports] = useState<any>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const [isRes, bsRes, valRes, auditRes] = await Promise.all([
                fetch("/api/reports/income-statement"),
                fetch("/api/reports/balance-sheet"),
                fetch("/api/reports/inventory-valuation"),
                fetch("/api/audit/logs")
            ]);

            // Safe JSON parsing - check response.ok before parsing
            const isData = isRes.ok ? await isRes.json() : { total_revenue: 0, total_expense: 0, net_income: 0 };
            const bsData = bsRes.ok ? await bsRes.json() : { total_assets: 0, total_liabilities: 0, total_equity: 0 };
            const valData = valRes.ok ? await valRes.json() : { total_inventory_value: 0 };
            const auditData = auditRes.ok ? await auditRes.json() : [];

            setReports({
                incomeStatement: isData,
                balanceSheet: bsData,
                valuation: Number(valData.total_inventory_value || 0).toLocaleString()
            });
            setAuditLogs(Array.isArray(auditData) ? auditData : []);
        } catch (err) {
            console.error("Reports fetch error:", err);
            // Set defaults so page can still render
            setReports({
                incomeStatement: { total_revenue: 0, total_expense: 0, net_income: 0 },
                balanceSheet: { total_assets: 0, total_liabilities: 0, total_equity: 0 },
                valuation: "0"
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading) return <div className="p-20 text-center font-bold text-slate-400">Loading Financial Statements...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Financial Reports / التقارير المالية</h1>
                    <p className="text-slate-500 text-sm font-medium">Official financial statements and inventory valuation</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white border border-slate-200 px-6 py-2.5 rounded-xl flex items-center gap-2 text-slate-600 font-bold hover:bg-slate-50 transition-all">
                        <Filter size={18} /> Date Range / الفترة
                    </button>
                    <button className="bg-slate-900 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg font-bold">
                        <Download size={18} /> Export / تصدير
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Income Statement */}
                <div className="enterprise-card border-none shadow-sm group">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                <PieChart size={20} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800">Income Statement / كشف الأرباح</h3>
                        </div>
                        <FileText className="text-slate-200" size={24} />
                    </div>
                    <div className="space-y-5">
                        <ReportLine label="Total Revenue / إجمالي الإيرادات" icon={<TrendingUp size={14} className="text-emerald-500" />} value={Number(reports.incomeStatement.total_revenue || 0).toLocaleString()} />
                        <ReportLine label="Cost of Goods Sold / كلفة المبيعات" icon={<TrendingDown size={14} className="text-rose-500" />} value={Number(reports.incomeStatement.total_expense || 0).toLocaleString()} negative />
                        <div className="border-t-2 border-slate-50 pt-5 flex justify-between items-center">
                            <div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Net Profit</span>
                                <span className="text-2xl font-black text-emerald-600 font-mono tabular-nums">{Number(reports.incomeStatement.net_income || 0).toLocaleString()}</span>
                            </div>
                            <span className="text-sm font-bold text-slate-400">IQD</span>
                        </div>
                    </div>
                </div>

                {/* Balance Sheet Summary */}
                <div className="enterprise-card border-none shadow-sm group">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                <Scale size={20} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800">Balance Sheet / الميزانية</h3>
                        </div>
                        <FileText className="text-slate-200" size={24} />
                    </div>
                    <div className="space-y-5">
                        <ReportLine label="Total Assets / الموجودات" value={Number(reports.balanceSheet.total_assets || 0).toLocaleString()} />
                        <ReportLine label="Total Liabilities / المطلوبات" value={Number(reports.balanceSheet.total_liabilities || 0).toLocaleString()} />
                        <div className="border-t-2 border-slate-50 pt-5 flex justify-between items-center">
                            <div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Owner's Equity</span>
                                <span className="text-2xl font-black text-indigo-600 font-mono tabular-nums">{Number(reports.balanceSheet.total_equity || 0).toLocaleString()}</span>
                            </div>
                            <button
                                onClick={() => window.location.href = '/api/reports/export/trial-balance'}
                                className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                                title="Export Trial Balance"
                            >
                                <FileDown size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Inventory Valuation */}
                <div className="enterprise-card border-none shadow-sm lg:col-span-2 overflow-hidden relative">
                    <div className="relative z-10 p-2">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl">
                                    <BarChart3 size={20} />
                                </div>
                                <h3 className="text-lg font-black text-slate-800">Inventory Valuation / تقييم المخزون</h3>
                            </div>
                            <div className="text-[10px] font-black px-3 py-1 bg-slate-100 text-slate-600 rounded-full tracking-widest uppercase">
                                Method: WAC / المتوسط المرجح
                            </div>
                        </div>
                        <div className="bg-slate-50/50 p-8 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Stock Market Value</p>
                                <div className="flex items-baseline gap-3">
                                    <h2 className="text-4xl font-black text-slate-800 font-mono tabular-nums">{reports.valuation}</h2>
                                    <span className="text-sm font-black text-slate-400">IQD</span>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => window.location.href = '/api/reports/export/inventory'}
                                    className="flex-1 md:flex-none p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all text-slate-600 flex items-center gap-2 text-xs font-bold"
                                >
                                    <FileDown size={18} /> Export CSV
                                </button>
                                <button className="flex-1 md:flex-none p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all text-slate-600"><Printer size={20} /></button>
                                <button className="flex-2 md:flex-none px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-black shadow-lg hover:bg-slate-800 transition-all flex items-center gap-3">
                                    Generate Full Report <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Background glow */}
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl"></div>
                </div>

                {/* Audit Trail / سجل التدقيق */}
                <div className="enterprise-card border-none shadow-sm lg:col-span-2">
                    <div className="flex items-center gap-3 p-2">
                        <button
                            onClick={() => window.location.href = '/api/reports/export/audit'}
                            className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition-colors border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2"
                        >
                            <FileDown size={14} /> Export CSV
                        </button>
                        <Activity className="text-slate-100" size={32} />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                <th className="pb-3 pr-4">Timestamp</th>
                                <th className="pb-3 px-4 text-center">Action</th>
                                <th className="pb-3 px-4">Entity</th>
                                <th className="pb-3 px-4">User</th>
                                <th className="pb-3 px-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {auditLogs.length === 0 ? (
                                <tr><td colSpan={5} className="py-8 text-center text-slate-400 font-medium">No activity recorded</td></tr>
                            ) : auditLogs.map((log: any) => (
                                <AuditRow key={log.id} log={log} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

