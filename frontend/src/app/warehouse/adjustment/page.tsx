"use client";
import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api";
import { ClipboardCheck, Plus, Save, X, Package, ShieldCheck, AlertCircle, MessageSquare } from "lucide-react";

export default function AdjustmentPage() {
    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    useEffect(() => {
        loadData();
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const [whRes, custRes, prodRes] = await Promise.all([
                fetchWithAuth("/api/warehouse/warehouses"),
                fetchWithAuth("/api/customers"),
                fetchWithAuth("/api/warehouse/products")
            ]);
            setWarehouses(whRes.ok ? await whRes.json() : []);
            const custData = custRes.ok ? await custRes.json() : {};
            setCustomers(custData.customers || []);
            setProducts(prodRes.ok ? await prodRes.json() : []);
        } catch (error) {
            console.error("Failed to load initial data", error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/warehouse/ops/adjustments");
            setAdjustments(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <ClipboardCheck className="text-amber-500" size={28} />
                        Inventory Adjustments / تسوية المخزون
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Reconcile physical stock with system records</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg active:scale-95"
                >
                    <Plus size={20} /> New Adjustment / تسوية جديدة
                </button>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {adjustments.map((adj, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-amber-200 transition-all">
                            <div className="flex justify-between items-center mb-4">
                                <div className="bg-amber-50 p-2.5 rounded-xl text-amber-600">
                                    <AlertCircle size={20} />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${adj.status === 'draft' ? 'bg-slate-50 text-slate-400 border-slate-100' :
                                    adj.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        'bg-rose-50 text-rose-600 border-rose-100'
                                    }`}>
                                    {adj.status}
                                </span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-black text-slate-800">#{adj.number}</h4>
                                    <p className="text-xs font-bold text-slate-400">{new Date(adj.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-xl">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Warehouse</p>
                                        <p className="text-xs font-bold text-slate-700">{warehouses.find(w => w.id === adj.warehouse_id)?.name || "N/A"}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                                        <p className="text-xs font-bold text-slate-700 truncate">{customers.find(c => c.id === adj.customer_id)?.company_name || "N/A"}</p>
                                    </div>
                                </div>
                                {adj.notes && (
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <MessageSquare size={14} />
                                        <p className="text-xs font-medium truncate">{adj.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <AdjustmentForm
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); loadData(); }}
                    warehouses={warehouses}
                    customers={customers}
                    products={products}
                />
            )}
        </div>
    );
}

function AdjustmentForm({ onClose, onSuccess, warehouses, customers, products }: any) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        number: `ADJ-${Math.floor(Math.random() * 9000) + 1000}`,
        warehouse_id: "",
        customer_id: "",
        items: [] as any[],
        notes: ""
    });

    const [itemInput, setItemInput] = useState({ item_id: "", quantity: "0", batch_number: "" });
    const [currentStock, setCurrentStock] = useState<number | null>(null);
    const [loadingStock, setLoadingStock] = useState(false);

    useEffect(() => {
        if (itemInput.item_id) {
            setLoadingStock(true);
            const warehouseParam = formData.warehouse_id ? `&warehouse_id=${formData.warehouse_id}` : '';
            fetchWithAuth(`/api/warehouse/ops/stock?item_id=${itemInput.item_id}${warehouseParam}`)
                .then(res => res.json())
                .then(data => setCurrentStock(data.balance))
                .catch(err => console.error("Error fetching stock", err))
                .finally(() => setLoadingStock(false));
        } else {
            setCurrentStock(null);
        }
    }, [itemInput.item_id, formData.warehouse_id]);

    const handleAddItem = () => {
        if (!itemInput.item_id) return;
        setFormData({ ...formData, items: [...formData.items, itemInput] });
        setItemInput({ item_id: "", quantity: "0", batch_number: "" });
        setCurrentStock(null);
    };

    const handleSubmit = async () => {
        console.log("AdjustmentForm: Submit initiated");
        if (!formData.warehouse_id || !formData.customer_id) {
            alert("Please select both a Warehouse and a Customer.");
            return;
        }

        // Auto-add item if drafted but not added
        let itemsToSubmit = [...formData.items];
        if (itemInput.item_id) {
            itemsToSubmit.push(itemInput);
        }

        if (itemsToSubmit.length === 0) {
            alert("Please add at least one item.");
            return;
        }

        setLoading(true);
        try {
            const payload = { ...formData, items: itemsToSubmit };
            console.log("AdjustmentForm: Sending payload", payload);
            const res = await fetchWithAuth("/api/warehouse/ops/adjustments", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            console.log("AdjustmentForm: Response status", res.status);

            if (res.ok) {
                onSuccess();
            } else {
                const err = await res.json();
                console.error("AdjustmentForm: Error response", err);
                alert(`Error: ${err.detail || 'Failed to create adjustment'}`);
            }
        } catch (err) {
            console.error("AdjustmentForm: Exception", err);
            alert("Connection error: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
                    <h3 className="text-lg font-black tracking-tight">New Adjustment / تسوية مخزنية</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="p-8 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Adjustment #</label>
                            <input readOnly className="form-input w-full bg-slate-50 font-mono font-bold" value={formData.number} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Warehouse</label>
                            <select className="form-input w-full font-bold" value={formData.warehouse_id} onChange={e => setFormData({ ...formData, warehouse_id: e.target.value })}>
                                <option value="">- Select -</option>
                                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Customer</label>
                        <select className="form-input w-full font-bold" value={formData.customer_id} onChange={e => setFormData({ ...formData, customer_id: e.target.value })}>
                            <option value="">- Select -</option>
                            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
                        </select>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Adjust Items</p>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-12">
                                <select className="form-input w-full font-bold text-sm" value={itemInput.item_id} onChange={e => setItemInput({ ...itemInput, item_id: e.target.value })}>
                                    <option value="">- Choose Item -</option>
                                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                {itemInput.item_id && (
                                    <div className="mt-1 px-1 flex justify-between items-center">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                                            {loadingStock ? "Checking stock..." : `Available: ${currentStock ?? 0} units @ ${warehouses.find(w => w.id === formData.warehouse_id)?.name || 'Global'}`}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-4">
                                <label className="text-[8px] font-black text-slate-400 block mb-1">Delta (+/-)</label>
                                <input type="number" className="form-input w-full text-sm font-bold" placeholder="Qty" value={itemInput.quantity} onChange={e => setItemInput({ ...itemInput, quantity: e.target.value })} />
                            </div>
                            <div className="md:col-span-8 flex gap-2">
                                <input className="form-input flex-1 text-sm font-bold" placeholder="Batch #" value={itemInput.batch_number} onChange={e => setItemInput({ ...itemInput, batch_number: e.target.value })} />
                                <button onClick={handleAddItem} className="bg-primary text-white p-2.5 rounded-xl"><Plus size={20} /></button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {formData.items.map((it, i) => (
                            <div key={i} className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-xl">
                                <div>
                                    <p className="font-black text-slate-800 text-sm">{products.find((p: any) => p.id === it.item_id)?.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400">Batch: {it.batch_number || "N/A"}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-lg font-black text-sm ${parseFloat(it.quantity) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {parseFloat(it.quantity) > 0 ? '+' : ''}{it.quantity}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Internal Notes</label>
                        <textarea className="form-input w-full min-h-[80px]" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Reason for adjustment..."></textarea>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-primary text-white px-10 py-3 rounded-2xl font-black shadow-lg"
                    >
                        {loading ? "Saving..." : "Create Adjustment / فتح طلب تسوية"}
                    </button>
                </div>
            </div>
        </div>
    );
}
