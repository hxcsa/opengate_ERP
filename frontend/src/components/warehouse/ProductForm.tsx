"use client";

import { useState, useEffect } from "react";
import { X, Save, Package, Hash, Barcode, Thermometer } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface ProductFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function ProductForm({ onClose, onSuccess }: ProductFormProps) {
    const [loading, setLoading] = useState(false);
    const [uoms, setUoms] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        barcode: "",
        unit: "PCS",
        storage_type: "DRY",
        inventory_account_id: "120101", // Default inventory account
        cogs_account_id: "510101",      // Default COGS
        revenue_account_id: "410101",   // Default Revenue
        customer_id: "",
        description: ""
    });

    useEffect(() => {
        fetchWithAuth("/api/warehouse/uoms")
            .then(res => res.json())
            .then(data => setUoms(data))
            .catch(err => console.error("Failed to fetch UOMs", err));

        fetchWithAuth("/api/customers")
            .then(res => res.json())
            .then(data => setCustomers(data.customers || data))
            .catch(err => console.error("Failed to fetch customers", err));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/warehouse/products", {
                method: "POST",
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                alert("Failed to create product");
            }
        } catch (err) {
            console.error(err);
            alert("Error connecting to API");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-200">
                <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary p-2 rounded-lg">
                            <Package size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">New Product / منتج جديد</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Warehouse Management</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Package size={14} /> Name / الاسم
                            </label>
                            <input
                                required
                                className="form-input w-full font-bold"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Hash size={14} /> Code (SKU) / الكود
                            </label>
                            <input
                                required
                                className="form-input w-full font-mono"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Barcode size={14} /> Barcode / الباركود
                            </label>
                            <input
                                className="form-input w-full font-mono"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                Unit / الوحدة
                            </label>
                            <select
                                className="form-input w-full font-bold"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            >
                                {uoms.length > 0 ? (
                                    uoms.map((u) => (
                                        <option key={u.id} value={u.code}>
                                            {u.code} ({u.name})
                                        </option>
                                    ))
                                ) : (
                                    <option value="PCS">Loading options...</option>
                                )}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                Customer / الزبون
                            </label>
                            <select
                                className="form-input w-full font-bold"
                                value={formData.customer_id}
                                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                            >
                                <option value="">- General Stock -</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.company_name || `${c.first_name} ${c.last_name}`}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Thermometer size={14} /> Storage Type / نوع التخزين
                            </label>
                            <select
                                className="form-input w-full font-bold"
                                value={formData.storage_type}
                                onChange={(e) => setFormData({ ...formData, storage_type: e.target.value })}
                            >
                                <option value="DRY">DRY / جاف</option>
                                <option value="COLD">COLD / مبرد</option>
                                <option value="FROZEN">FROZEN / مجمد</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg"
                        >
                            <Save size={20} />
                            {loading ? "Saving..." : "Save Product / حفظ المنتج"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
