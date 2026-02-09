"use client";

import { useEffect, useState } from "react";
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
    Wallet, Package, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight,
    Clock, History, LineChart as ChartIcon, ShieldCheck
} from "lucide-react";
import SaleForm from "@/components/SaleForm";
import PurchaseForm from "@/components/PurchaseForm";
import { auth } from "@/lib/firebase";
import React, { useCallback, memo } from "react";

const KpiCard = memo(({ title, value, icon, trend, trendUp, description }: any) => (
    <div className="enterprise-card flex flex-col justify-between group">
        <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all duration-300">
                {icon}
            </div>
            {trend && (
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {trend}
                </span>
            )}
        </div>
        <div>
            <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">{title}</p>
            <h4 className="text-2xl font-black text-slate-800 tabular-nums">{value}</h4>
            {description && <p className="text-[10px] text-slate-400 mt-2 font-medium">{description}</p>}
        </div>
    </div>
));
KpiCard.displayName = "KpiCard";

const QuickButton = memo(({ label, icon, color, onClick }: any) => {
    const colors: any = {
        emerald: "hover:bg-emerald-600 text-emerald-400 hover:text-white border-emerald-500/20",
        blue: "hover:bg-blue-600 text-blue-400 hover:text-white border-blue-500/20",
        amber: "hover:bg-amber-600 text-amber-400 hover:text-white border-amber-500/20",
    };
    return (
        <button
            onClick={onClick}
            className={`w-full text-right p-4 rounded-xl border transition-all flex items-center justify-between font-bold text-sm ${colors[color]}`}
        >
            <span className="opacity-90">{label}</span>
            <div className="p-1.5 bg-white/5 rounded-lg">{icon}</div>
        </button>
    );
});
QuickButton.displayName = "QuickButton";

const JournalRow = memo(({ je }: any) => (
    <tr>
        <td className="font-mono text-xs font-bold text-blue-600">{je.number}</td>
        <td className="max-w-[150px] truncate">{je.description || "Entry"}</td>
        <td className="font-bold text-slate-800">
            {Number(je.lines?.[0]?.debit || je.lines?.[0]?.credit || 0).toLocaleString()}
        </td>
        <td>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                {je.status}
            </span>
        </td>
    </tr>
));
JournalRow.displayName = "JournalRow";

const StockRow = memo(({ item }: any) => (
    <tr>
        <td className="font-mono text-[10px] text-slate-400">{item.sku}</td>
        <td className="font-bold">{item.name}</td>
        <td className="font-bold text-slate-700">{Number(item.current_qty).toLocaleString()} {item.unit}</td>
        <td>
            {Number(item.current_qty) < 10 ? (
                <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[10px]">
                    <AlertTriangle size={12} /> RESTOCK
                </div>
            ) : (
                <div className="text-emerald-600 font-bold text-[10px]">OK</div>
            )}
        </td>
    </tr>
));
StockRow.displayName = "StockRow";

export default function Dashboard() {
    const [stats, setStats] = useState({
        cashBalance: "0",
        lowStock: 0,
        todaySales: "0",
        pendingInvoices: 0
    });

    const [chartData, setChartData] = useState<any[]>([]);
    const [journalEntries, setJournalEntries] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);

    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [journalsRes, itemsRes, statsRes, trendRes] = await Promise.all([
                fetch("/api/accounting/journals?limit=5"),
                fetch("/api/inventory/items?limit=5"),
                fetch("/api/reports/dashboard"),
                fetch("/api/reports/weekly-trend")
            ]);

            // Safe JSON parsing with error handling
            const journals = journalsRes.ok ? await journalsRes.json() : [];
            const itemsData = itemsRes.ok ? await itemsRes.json() : [];
            const statsData = statsRes.ok ? await statsRes.json() : { cashBalance: "0", lowStock: 0, todaySales: "0", pendingInvoices: 0 };
            const trendData = trendRes.ok ? await trendRes.json() : [];

            if (Array.isArray(journals)) setJournalEntries(journals);
            if (Array.isArray(itemsData)) setItems(itemsData);
            if (statsData) setStats(statsData);
            if (Array.isArray(trendData)) setChartData(trendData);
        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // CRITICAL: Call fetchData when component mounts!
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    title="Cash Balance / رصيد الصندوق"
                    value={`${stats.cashBalance} IQD`}
                    icon={<Wallet className="text-blue-600" size={20} />}
                    trend="+5.2%"
                    trendUp={true}
                />
                <KpiCard
                    title="Low Stock / نواقص المخزن"
                    value={stats.lowStock}
                    icon={<AlertTriangle className="text-amber-600" size={20} />}
                    description="Items below minimum"
                />
                <KpiCard
                    title="Sales (This Month) / مبيعات الشهر"
                    value={`${stats.todaySales} IQD`}
                    icon={<TrendingUp className="text-emerald-600" size={20} />}
                    trend="+12%"
                    trendUp={true}
                />
                <KpiCard
                    title="Pending Invoices / الفواتير المعلقة"
                    value={stats.pendingInvoices}
                    icon={<Clock className="text-slate-600" size={20} />}
                    description="Awaiting payment"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sales Chart */}
                <div className="lg:col-span-2 enterprise-card">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                <ChartIcon size={20} />
                            </div>
                            <h3 className="text-lg font-bold">Weekly Growth / النمو الأسبوعي</h3>
                        </div>
                        <select className="text-xs bg-slate-50 border-none rounded-lg px-2 py-1 outline-none font-bold text-slate-500">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full min-h-[300px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} />
                                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                                    />
                                    <Bar dataKey="sales" fill="#2563eb" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                                No trend data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="enterprise-card bg-slate-900 border-none text-white overflow-hidden relative">
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold mb-6">Quick Actions / اختصارات</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <QuickButton
                                label="New Sale / بيع جديد"
                                icon={<ArrowUpRight size={18} />}
                                color="emerald"
                                onClick={() => setShowSaleModal(true)}
                            />
                            <QuickButton
                                label="New Purchase / شراء جديد"
                                icon={<ArrowDownRight size={18} />}
                                color="blue"
                                onClick={() => setShowPurchaseModal(true)}
                            />
                            <QuickButton
                                label="Stock Out / صرف مخزني"
                                icon={<ArrowDownRight size={18} />}
                                color="amber"
                                onClick={() => setShowSaleModal(true)}
                            />
                        </div>
                    </div>
                    {/* Subtle background element */}
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
                </div>
            </div>

            {showSaleModal && <SaleForm onClose={() => setShowSaleModal(false)} onSuccess={fetchData} />}
            {showPurchaseModal && <PurchaseForm onClose={() => setShowPurchaseModal(false)} onSuccess={fetchData} />}

            {/* Tables Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="enterprise-card border-none shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <History size={18} className="text-slate-400" />
                        <h3 className="text-base font-bold">Recent Journals / القيود المحاسبية</h3>
                    </div>
                    <div className="overflow-auto">
                        <table className="enterprise-table">
                            <thead>
                                <tr>
                                    <th>Number</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {journalEntries.length > 0 ? journalEntries.map((je: any) => (
                                    <JournalRow key={je.id} je={je} />
                                )) : (
                                    <tr><td colSpan={4} className="text-center text-slate-400 py-12 text-sm font-medium">Looking for data...</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="enterprise-card border-none shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <Package size={18} className="text-slate-400" />
                        <h3 className="text-base font-bold">Stock Status / حالة المخزن</h3>
                    </div>
                    <div className="overflow-auto">
                        <table className="enterprise-table">
                            <thead>
                                <tr>
                                    <th>SKU</th>
                                    <th>Item</th>
                                    <th>Stock</th>
                                    <th>Alert</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length > 0 ? items.map((item: any) => (
                                    <StockRow key={item.id} item={item} />
                                )) : (
                                    <tr><td colSpan={4} className="text-center text-slate-400 py-12 text-sm font-medium">No items found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Admin Repair Access */}
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-center justify-between mt-8">
                <div>
                    <h4 className="text-amber-800 font-bold flex items-center gap-2">
                        <ShieldCheck size={18} />
                        Permissions Issue? / مشكلة في الصلاحيات؟
                    </h4>
                    <p className="text-amber-600 text-xs mt-1 font-medium">If you are an admin but see 0s or restricted tabs, click to repair your account.</p>
                </div>
                <button
                    onClick={async () => {
                        const token = await auth.currentUser?.getIdToken();
                        const res = await fetch("/api/setup/repair-admin", {
                            method: "POST",
                            headers: { "Authorization": `Bearer ${token}` }
                        });
                        if (res.ok) {
                            alert("Account promoted to Admin. Please refresh the page.");
                            window.location.reload();
                        }
                    }}
                    className="bg-amber-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-amber-700 transition-all text-sm shadow-md"
                >
                    Repair My Admin Role
                </button>
            </div>
        </div>
    );
}

