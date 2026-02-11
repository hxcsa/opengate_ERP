"use client";

import { useEffect, useState } from "react";
import { Package, Warehouse, Ruler, LayoutGrid, AlertTriangle, Truck, ClipboardCheck, TrendingUp } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import ProductsTab from "@/components/warehouse/ProductsTab";
import WarehousesTab from "@/components/warehouse/WarehousesTab";
import UOMTab from "@/components/warehouse/UOMTab";

export default function WarehousePage() {
    const [activeTab, setActiveTab] = useState("overview");
    const [stats, setStats] = useState({ totalItems: 0, lowStock: 0, totalWarehouses: 0 });
    const [recentIntents, setRecentIntents] = useState<any[]>([]);
    const [recentAdjustments, setRecentAdjustments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeTab === "overview") {
            setLoading(true);
            Promise.all([
                fetchWithAuth("/api/warehouse/products"),
                fetchWithAuth("/api/warehouse/warehouses"),
                fetchWithAuth("/api/warehouse/intents"),
                fetchWithAuth("/api/warehouse/ops/adjustments")
            ]).then(async ([prodRes, whRes, intRes, adjRes]) => {
                const prods = prodRes.ok ? await prodRes.json() : [];
                const whs = whRes.ok ? await whRes.json() : [];
                const ints = intRes.ok ? await intRes.json() : [];
                const adjs = adjRes.ok ? await adjRes.json() : [];

                setStats({
                    totalItems: prods.length,
                    lowStock: prods.filter((p: any) => Number(p.current_qty) < 10).length,
                    totalWarehouses: whs.length
                });
                setRecentIntents(ints.slice(0, 5));
                setRecentAdjustments(adjs.slice(0, 5));
            }).finally(() => setLoading(false));
        }
    }, [activeTab]);

    const tabs = [
        { id: "overview", label: "Overview / نظرة عامة", icon: LayoutGrid },
        { id: "products", label: "Products / المنتجات", icon: Package },
        { id: "warehouses", label: "Warehouses / المخازن", icon: Warehouse },
        { id: "uom", label: "UOM / وحدات القياس", icon: Ruler },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Warehouse Management / إدارة المستودعات</h1>
                    <p className="text-slate-500 text-sm font-medium">Stock control, inventory logic, and measurement components</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit overflow-x-auto max-w-full">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black transition-all whitespace-nowrap ${activeTab === tab.id
                                ? "bg-white text-primary shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === "overview" && (
                    <div className="space-y-8">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="enterprise-card p-6 flex items-center gap-4 bg-white border-none shadow-sm">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Package size={24} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Products</p>
                                    <h4 className="text-2xl font-black text-slate-800">{stats.totalItems}</h4>
                                </div>
                            </div>
                            <div className={`enterprise-card p-6 flex items-center gap-4 border-none shadow-sm ${stats.lowStock > 0 ? "bg-amber-50" : "bg-white"}`}>
                                <div className={`p-3 rounded-xl ${stats.lowStock > 0 ? "bg-amber-100 text-amber-600" : "bg-slate-50 text-slate-400"}`}><AlertTriangle size={24} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Items</p>
                                    <h4 className={`text-2xl font-black ${stats.lowStock > 0 ? "text-amber-600" : "text-slate-800"}`}>{stats.lowStock}</h4>
                                </div>
                            </div>
                            <div className="enterprise-card p-6 flex items-center gap-4 bg-white border-none shadow-sm">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Warehouse size={24} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Warehouses</p>
                                    <h4 className="text-2xl font-black text-slate-800">{stats.totalWarehouses}</h4>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Recent Intents */}
                            <div className="enterprise-card p-6 bg-white border-none shadow-sm min-h-[400px]">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Truck size={18} className="text-primary" />
                                    Recent Intents / آخر الطلبات
                                </h3>
                                {loading ? (
                                    <div className="flex items-center justify-center h-64 text-slate-300 font-bold animate-pulse">Loading...</div>
                                ) : (
                                    <div className="space-y-4">
                                        {recentIntents.map((intent: any) => (
                                            <div key={intent.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-primary/20 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg text-xs font-black ${intent.type === 'get' ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'}`}>
                                                        {intent.type === 'get' ? 'IN' : 'OUT'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-800">#{intent.number}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{intent.status}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-primary uppercase leading-none">{intent.items?.length || 0} Items</p>
                                                    <p className="text-[9px] text-slate-400 mt-1 font-bold">{new Date(intent.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {recentIntents.length === 0 && <p className="text-center py-12 text-slate-400 font-bold italic">No recent intents</p>}
                                    </div>
                                )}
                            </div>

                            {/* Recent Adjustments */}
                            <div className="enterprise-card p-6 bg-white border-none shadow-sm min-h-[400px]">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <ClipboardCheck size={18} className="text-amber-500" />
                                    Recent Adjustments / آخر التسويات
                                </h3>
                                {loading ? (
                                    <div className="flex items-center justify-center h-64 text-slate-300 font-bold animate-pulse">Loading...</div>
                                ) : (
                                    <div className="space-y-4">
                                        {recentAdjustments.map((adj: any) => (
                                            <div key={adj.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-amber-200 transition-all">
                                                <div>
                                                    <p className="text-sm font-black text-slate-800">#{adj.number}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate max-w-[150px]">{adj.notes || 'No notes'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-amber-600 uppercase leading-none">{adj.items?.length || 0} Delta</p>
                                                    <p className="text-[9px] text-slate-400 mt-1 font-bold">{new Date(adj.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {recentAdjustments.length === 0 && <p className="text-center py-12 text-slate-400 font-bold italic">No recent adjustments</p>}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Inventory Analytics Preview */}
                        <div className="enterprise-card p-8 bg-[#0f172a] text-white border-none shadow-xl relative overflow-hidden">
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Stock Strategic View</h3>
                                    <p className="text-slate-400 text-xs font-medium max-w-lg">
                                        Real-time tracking of item movement across the entire supply chain.
                                        Check Stock valuation, turnover rates, and warehouse efficiency.
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Health</p>
                                        <div className="flex items-center gap-2 text-emerald-400 font-bold mt-1">
                                            <TrendingUp size={16} />
                                            <span>EXCELLENT</span>
                                        </div>
                                    </div>
                                    <button className="bg-blue-600 hover:bg-blue-700 transition-all px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">
                                        Explore Analytics
                                    </button>
                                </div>
                            </div>
                            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
                        </div>
                    </div>
                )}
                {activeTab === "products" && <ProductsTab />}
                {activeTab === "warehouses" && <WarehousesTab />}
                {activeTab === "uom" && <UOMTab />}
            </div>
        </div>
    );
}
