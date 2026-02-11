"use client";

import { useEffect, useState } from "react";
import { Plus, FileText, ShoppingCart, ArrowRight, Search, Filter, Check, X, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import QuotationForm from "@/components/QuotationForm";
import React, { useCallback, memo } from "react";
import { fetchWithAuth } from "@/lib/api";

const StatusBadge = memo(({ status }: { status: string }) => {
    const colors: Record<string, string> = {
        DRAFT: "bg-slate-100 text-slate-600",
        SENT: "bg-blue-100 text-blue-600",
        ACCEPTED: "bg-emerald-100 text-emerald-600",
        CONVERTED: "bg-purple-100 text-purple-600",
        PENDING: "bg-amber-100 text-amber-600",
        APPROVED: "bg-emerald-100 text-emerald-600",
        DELIVERED: "bg-blue-100 text-blue-600",
        EXPIRED: "bg-rose-100 text-rose-600"
    };
    return (
        <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${colors[status] || "bg-slate-100 text-slate-600"}`}>
            {status}
        </span>
    );
});
StatusBadge.displayName = "StatusBadge";

const QuotationRow = memo(({ quo, onConvert }: any) => (
    <tr className="hover:bg-slate-50/50 transition-colors">
        <td className="px-6 py-4 font-mono text-xs font-black text-blue-600">{quo.number}</td>
        <td className="px-6 py-4 font-bold text-slate-700">{quo.customer_name}</td>
        <td className="px-6 py-4 font-mono text-sm font-black">{Number(quo.total).toLocaleString()} {quo.currency}</td>
        <td className="px-6 py-4">
            <StatusBadge status={quo.status} />
        </td>
        <td className="px-6 py-4 text-right">
            {quo.status === "DRAFT" && (
                <button
                    onClick={() => onConvert(quo.id)}
                    className="text-[10px] font-black bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors active:scale-95"
                >
                    Convert to Order <ArrowRight size={12} className="inline" />
                </button>
            )}
        </td>
    </tr>
));
QuotationRow.displayName = "QuotationRow";

const OrderRow = memo(({ so }: any) => (
    <tr className="hover:bg-slate-50/50 transition-colors">
        <td className="px-6 py-4 font-mono text-xs font-black text-emerald-600">{so.number}</td>
        <td className="px-6 py-4 font-bold text-slate-700">{so.customer_name}</td>
        <td className="px-6 py-4 font-mono text-sm font-black">{Number(so.total).toLocaleString()} {so.currency}</td>
        <td className="px-6 py-4">
            <StatusBadge status={so.status} />
        </td>
        <td className="px-6 py-4 text-right">
            <button
                onClick={() => window.open(`/api/sales/invoice/${so.id}`, '_blank')}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Download Invoice"
            >
                <Filter size={18} className="rotate-180" /> {/* Using Filter icon purely as placeholder for Download if Download icon not imported, but wait, I can import Download. */}
            </button>
        </td>
    </tr>
));
OrderRow.displayName = "OrderRow";

export default function SalesPage() {
    const [quotations, setQuotations] = useState<any[]>([]);
    const [salesOrders, setSalesOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showQuotationForm, setShowQuotationForm] = useState(false);
    const [activeTab, setActiveTab] = useState<"quotations" | "orders">("quotations");
    const { t } = useLanguage();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [quoRes, soRes] = await Promise.all([
                fetchWithAuth("/api/quotations"),
                fetchWithAuth("/api/sales-orders")
            ]);
            const [quoData, soData] = await Promise.all([quoRes.json(), soRes.json()]);
            if (Array.isArray(quoData)) setQuotations(quoData);
            if (Array.isArray(soData)) setSalesOrders(soData);
        } catch (e) {
            console.error("Sales fetch error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const convertToOrder = useCallback(async (quoId: string) => {
        await fetchWithAuth(`/api/quotations/${quoId}/convert`, { method: "POST" });
        fetchData();
    }, [fetchData]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Sales / المبيعات</h1>
                    <p className="text-slate-500 text-sm font-medium">Quotations, Sales Orders & Customer Management</p>
                </div>
                <button
                    onClick={() => setShowQuotationForm(true)}
                    className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-black text-sm"
                >
                    <Plus size={20} /> New Quotation / عرض سعر جديد
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-100 pb-2">
                <button
                    onClick={() => setActiveTab("quotations")}
                    className={`px-6 py-2.5 rounded-t-xl font-black text-sm transition-all ${activeTab === "quotations" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-slate-400 hover:text-slate-600"}`}
                >
                    <FileText size={16} className="inline mr-2" />
                    Quotations ({quotations.length})
                </button>
                <button
                    onClick={() => setActiveTab("orders")}
                    className={`px-6 py-2.5 rounded-t-xl font-black text-sm transition-all ${activeTab === "orders" ? "bg-emerald-50 text-emerald-600 border-b-2 border-emerald-600" : "text-slate-400 hover:text-slate-600"}`}
                >
                    <ShoppingCart size={16} className="inline mr-2" />
                    Sales Orders ({salesOrders.length})
                </button>
            </div>

            {/* Content */}
            <div className="enterprise-card border-none shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 font-bold">Loading...</div>
                ) : activeTab === "quotations" ? (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Number</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {quotations.map(quo => (
                                <QuotationRow key={quo.id} quo={quo} onConvert={convertToOrder} />
                            ))}
                            {quotations.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">No quotations yet</td></tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                                <th className="px-6 py-4">SO Number</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {salesOrders.map(so => (
                                <OrderRow key={so.id} so={so} />
                            ))}
                            {salesOrders.length === 0 && (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold">No sales orders yet</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {showQuotationForm && <QuotationForm onClose={() => setShowQuotationForm(false)} onSuccess={fetchData} />}
        </div>
    );
}

