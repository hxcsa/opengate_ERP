"use client";

import { useEffect, useState } from "react";
import { Plus, Truck, Check, Clock, FileText, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import PurchaseOrderForm from "@/components/PurchaseOrderForm";

export default function PurchasingPage() {
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPOForm, setShowPOForm] = useState(false);
    const { t } = useLanguage();

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/purchase-orders");
            const data = await res.json();
            if (Array.isArray(data)) setPurchaseOrders(data);
        } catch (e) {
            console.error("PO fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const approvePO = async (poId: string) => {
        await fetch(`/api/purchase-orders/${poId}/approve`, { method: "POST" });
        fetchData();
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Purchasing / المشتريات</h1>
                    <p className="text-slate-500 text-sm font-medium">Manage Purchase Orders & Supplier Relations</p>
                </div>
                <button
                    onClick={() => setShowPOForm(true)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 font-black text-sm"
                >
                    <Plus size={20} /> New Purchase Order / طلب شراء جديد
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Total POs" value={purchaseOrders.length.toString()} icon={<FileText />} color="bg-blue-500" />
                <StatCard label="Pending Approval" value={purchaseOrders.filter(p => p.status === "DRAFT").length.toString()} icon={<Clock />} color="bg-amber-500" />
                <StatCard label="Approved" value={purchaseOrders.filter(p => p.status === "APPROVED").length.toString()} icon={<Check />} color="bg-emerald-500" />
                <StatCard label="Received" value={purchaseOrders.filter(p => p.status === "RECEIVED").length.toString()} icon={<Truck />} color="bg-slate-800" />
            </div>

            {/* Table */}
            <div className="enterprise-card border-none shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input placeholder="Search POs..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400 font-bold">Loading...</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                                <th className="px-6 py-4">PO Number</th>
                                <th className="px-6 py-4">Supplier</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {purchaseOrders.map(po => (
                                <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs font-black text-indigo-600">{po.number}</td>
                                    <td className="px-6 py-4 font-bold text-slate-700">{po.supplier_name}</td>
                                    <td className="px-6 py-4 font-mono text-sm font-black">{Number(po.total).toLocaleString()} {po.currency}</td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={po.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {po.status === "DRAFT" && (
                                            <button
                                                onClick={() => approvePO(po.id)}
                                                className="text-[10px] font-black bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
                                            >
                                                <Check size={12} className="inline mr-1" /> Approve
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {purchaseOrders.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">No purchase orders yet</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {showPOForm && <PurchaseOrderForm onClose={() => setShowPOForm(false)} onSuccess={fetchData} />}
        </div>
    );
}

function StatCard({ label, value, icon, color }: any) {
    return (
        <div className={`${color} text-white p-6 rounded-2xl flex items-center justify-between shadow-lg`}>
            <div>
                <p className="text-[10px] font-black opacity-70 uppercase tracking-widest">{label}</p>
                <h4 className="text-2xl font-black">{value}</h4>
            </div>
            <div className="p-3 bg-white/10 rounded-xl">{icon}</div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        DRAFT: "bg-slate-100 text-slate-600",
        APPROVED: "bg-emerald-100 text-emerald-600",
        RECEIVED: "bg-blue-100 text-blue-600",
        PAID: "bg-purple-100 text-purple-600"
    };
    return (
        <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${colors[status] || "bg-slate-100 text-slate-600"}`}>
            {status}
        </span>
    );
}
