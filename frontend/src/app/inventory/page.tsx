"use client";

import { useEffect, useState } from "react";
import {
    Package, Plus, Search, Filter, Warehouse,
    BarChart3, TrendingDown, ClipboardList, ArrowRightLeft,
    History, X
} from "lucide-react";
import ItemForm from "@/components/ItemForm";
import SaleForm from "@/components/SaleForm";
import TransferForm from "@/components/TransferForm";
import ReconciliationForm from "@/components/ReconciliationForm";
import InventoryAnalytics from "@/components/InventoryAnalytics";
import { useLanguage } from "@/contexts/LanguageContext";

import React, { useCallback, memo } from "react";

// Memoized Action Button
const InventoryAction = memo(({ title, sub, icon, color, onClick }: any) => (
    <button
        onClick={onClick}
        className={`${color} text-white p-6 rounded-2xl flex items-center justify-between group hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl active:scale-95`}
    >
        <div className="text-left">
            <h4 className="text-lg font-black leading-tight">{title}</h4>
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{sub}</p>
        </div>
        <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-all">
            {icon}
        </div>
    </button>
));

InventoryAction.displayName = "InventoryAction";

// Memoized Table Row
const InventoryRow = memo(({ item, onHistoryClick }: any) => (
    <tr className="hover:bg-slate-50/50 transition-colors group">
        <td className="px-6 py-4">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onHistoryClick(item)}
                    className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-bold text-xs uppercase hover:bg-slate-800 hover:text-white transition-all active:scale-90"
                    title="View Stock History"
                >
                    <History size={16} />
                </button>
                <div>
                    <div className="font-black text-slate-800">{item.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 font-mono">{item.sku}</div>
                </div>
            </div>
        </td>
        <td className="px-6 py-4">
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                {item.category || "General"}
            </span>
        </td>
        <td className="px-6 py-4 text-right">
            <div className="font-black text-slate-800 font-mono">{Number(item.current_qty).toFixed(0)}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">{item.unit}</div>
        </td>
        <td className="px-6 py-4 text-right">
            <div className="font-bold text-slate-600 font-mono text-sm">{Number(item.current_wac).toLocaleString()}</div>
        </td>
        <td className="px-6 py-4 text-right">
            <div className="font-black text-primary font-mono tabular-nums">{Number(item.total_value).toLocaleString()}</div>
            <div className="text-[10px] font-bold text-slate-300 uppercase">IQD</div>
        </td>
    </tr>
));

InventoryRow.displayName = "InventoryRow";

export default function Inventory() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showReconcileModal, setShowReconcileModal] = useState(false);
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [historyItem, setHistoryItem] = useState<any>(null);
    const { t } = useLanguage();

    const fetchItems = useCallback(() => {
        setLoading(true);
        fetch("/api/inventory/items")
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) setItems(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchItems();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Inventory Management / إدارة المخزون</h1>
                    <p className="text-slate-500 text-sm font-medium">Real-time stock levels and warehouse distribution</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-black text-sm"
                >
                    <Plus size={20} /> Add New Item / إضافة مادة
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <InventoryAction
                    title="Stock Out"
                    sub="صرف مخزني"
                    icon={<TrendingDown size={18} />}
                    color="bg-amber-500"
                    onClick={() => setShowSaleModal(true)}
                />
                <InventoryAction
                    title="Transfer" sub="تحويل" icon={<ArrowRightLeft size={18} />} color="bg-indigo-500"
                    onClick={() => setShowTransferModal(true)}
                />
                <InventoryAction
                    title="Count" sub="جرد" icon={<ClipboardList size={18} />} color="bg-slate-800"
                    onClick={() => setShowReconcileModal(true)}
                />
                <InventoryAction
                    title="Analytics" sub="تحليلات" icon={<BarChart3 size={18} />} color="bg-blue-600"
                    onClick={() => setShowAnalyticsModal(true)}
                />
            </div>

            <div className="enterprise-card border-none shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            placeholder="Search by SKU, Name, or Category..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all">
                            <Filter size={16} /> Filter
                        </button>
                        <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all">
                            <Warehouse size={16} /> All Warehouses
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Item Details / المادة</th>
                                <th className="px-6 py-4">Category / الصنف</th>
                                <th className="px-6 py-4 text-right">Available Qty / الكمية</th>
                                <th className="px-6 py-4 text-right">Average Cost / الكلفة</th>
                                <th className="px-6 py-4 text-right">Total Value / القيمة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">Fetching Warehouse Data...</td>
                                </tr>
                            ) : items.map((item) => (
                                <InventoryRow key={item.id} item={item} onHistoryClick={setHistoryItem} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAddModal && <ItemForm onClose={() => setShowAddModal(false)} onSuccess={fetchItems} />}
            {showSaleModal && <SaleForm onClose={() => setShowSaleModal(false)} onSuccess={fetchItems} />}
            {showTransferModal && <TransferForm onClose={() => setShowTransferModal(false)} onSuccess={fetchItems} />}
            {showReconcileModal && <ReconciliationForm onClose={() => setShowReconcileModal(false)} onSuccess={fetchItems} />}
            {showAnalyticsModal && <InventoryAnalytics onClose={() => setShowAnalyticsModal(false)} />}

            {/* Stock History Modal */}
            {historyItem && (
                <HistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />
            )}
        </div>
    );
}

function HistoryModal({ item, onClose }: any) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/inventory/history?item_id=${item.id}`)
            .then(res => res.json())
            .then(data => {
                setHistory(data);
                setLoading(false);
            });
    }, [item]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col animate-in zoom-in duration-200">
                <div className="p-6 bg-slate-800 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg"><ClipboardList size={20} /></div>
                        <div>
                            <h3 className="text-lg font-bold">{item.name}</h3>
                            <p className="text-[10px] opacity-70 font-mono tracking-widest">{item.sku}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr className="text-[10px] font-black uppercase text-slate-400">
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Note / Description</th>
                                <th className="px-4 py-3 text-right">Qty</th>
                                <th className="px-4 py-3 text-right">Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-bold">Loading History...</td></tr> :
                                history.map((h) => (
                                    <tr key={h.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 text-xs font-mono text-slate-500">
                                            {h.timestamp?.seconds ? new Date(h.timestamp.seconds * 1000).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${Number(h.quantity) > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                }`}>
                                                {h.source_document_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate" title={h.description || ''}>
                                            {h.description || '-'}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-mono text-xs font-black ${Number(h.quantity) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {Number(h.quantity) > 0 ? '+' : ''}{Number(h.quantity)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-slate-400 font-mono">
                                            {Number(h.valuation_rate).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

