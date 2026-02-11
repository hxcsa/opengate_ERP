"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Filter, Box, History, Thermometer } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { Loader2 } from "lucide-react";
import ProductForm from "./ProductForm";

export default function ProductsTab() {
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/warehouse/products");
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }

            const custRes = await fetchWithAuth("/api/customers");
            if (custRes.ok) {
                const custData = await custRes.json();
                setCustomers(custData.customers || custData);
            }
        } catch (err) {
            console.error("Failed to fetch products/customers:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-black text-sm"
                >
                    <Plus size={20} /> Add New Product / إضافة منتج
                </button>
            </div>

            {showAddModal && (
                <ProductForm onClose={() => setShowAddModal(false)} onSuccess={fetchProducts} />
            )}

            <div className="enterprise-card border-none shadow-sm overflow-hidden bg-white rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Product Details / المنتج</th>
                                <th className="px-6 py-4">Client / الزبون</th>
                                <th className="px-6 py-4">Code / الكود</th>
                                <th className="px-6 py-4">Barcode / الباركود</th>
                                <th className="px-6 py-4">UOM / الوحدة</th>
                                <th className="px-6 py-4">Storage / التخزين</th>
                                <th className="px-6 py-4 text-right">Created At / تاريخ الإنشاء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                                        <div className="flex flex-col items-center gap-2 text-primary">
                                            <Loader2 className="animate-spin" size={24} />
                                            <span>Loading Products...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">No products found.</td>
                                </tr>
                            ) : products.map((product) => (
                                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-black text-slate-800">{product.name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-bold text-slate-500">
                                            {customers.find((c: any) => c.id === product.customer_id)?.company_name || "General"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm text-slate-500">{product.sku}</td>
                                    <td className="px-6 py-4 font-mono text-sm text-slate-500">{product.barcode || "-"}</td>
                                    <td className="px-6 py-4 uppercase text-[10px] font-black">{product.unit}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${product.storage_type === 'FROZEN' ? 'bg-blue-50 text-blue-600' :
                                            product.storage_type === 'COLD' ? 'bg-cyan-50 text-cyan-600' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                            {product.storage_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-xs text-slate-400">
                                        {product.created_at ? new Date(product.created_at).toLocaleDateString() : "-"}
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
