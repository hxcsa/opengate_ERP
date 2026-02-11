"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Warehouse as WarehouseIcon, MapPin } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { Loader2 } from "lucide-react";
import WarehouseForm from "./WarehouseForm";

export default function WarehousesTab() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchWarehouses = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/warehouse/warehouses");
            if (res.ok) {
                const data = await res.json();
                setWarehouses(data);
            }
        } catch (err) {
            console.error("Failed to fetch warehouses:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWarehouses();
    }, [fetchWarehouses]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        placeholder="Search warehouses..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-black text-sm"
                >
                    <Plus size={20} /> Add Warehouse / إضافة مخزن
                </button>
            </div>

            {showAddModal && (
                <WarehouseForm onClose={() => setShowAddModal(false)} onSuccess={fetchWarehouses} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center gap-2 text-primary font-bold">
                        <Loader2 className="animate-spin" size={32} />
                        <span>Loading Warehouses...</span>
                    </div>
                ) : warehouses.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-slate-400 font-bold">No warehouses found.</div>
                ) : warehouses.map((wh) => (
                    <div key={wh.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-primary/5 transition-colors">
                                <WarehouseIcon className="text-slate-400 group-hover:text-primary" size={24} />
                            </div>
                            <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                {wh.code}
                            </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-800 mb-1">{wh.name}</h3>
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-4">
                            <MapPin size={14} />
                            {wh.location || "No location set"}
                        </div>
                        <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capacity</div>
                            <div className="font-bold text-slate-700 font-mono">{wh.capacity || "N/A"}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
