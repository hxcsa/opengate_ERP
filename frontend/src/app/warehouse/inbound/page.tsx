"use client";
import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api";
import { Truck, Package, Calendar, User, Search, Filter } from "lucide-react";

export default function InboundPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);

    // Filters
    const [filterWh, setFilterWh] = useState("");
    const [filterCust, setFilterCust] = useState("");

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        loadInbound();
    }, [filterWh, filterCust]);

    const [showForm, setShowForm] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);

    const loadInitialData = async () => {
        try {
            const [whRes, custRes, prodRes, supRes, accRes] = await Promise.all([
                fetchWithAuth("/api/warehouse/warehouses"),
                fetchWithAuth("/api/customers"),
                fetchWithAuth("/api/warehouse/products"),
                fetchWithAuth("/api/accounting/suppliers"),
                fetchWithAuth("/api/accounting/accounts?type=LIABILITY")
            ]);

            setWarehouses(whRes.ok ? await whRes.json() : []);
            const custData = custRes.ok ? await custRes.json() : {};
            setCustomers(custData.customers || []);
            setProducts(prodRes.ok ? await prodRes.json() : []);
            const supData = supRes.ok ? await supRes.json() : {};
            setSuppliers(supData.suppliers || []);
            setAccounts(accRes.ok ? await accRes.json() : []);
        } catch (error) {
            console.error("Failed to load initial data", error);
            // Defaults are already set to []
        }
    };

    const loadInbound = async () => {
        setLoading(true);
        try {
            const url = new URL("/api/warehouse/ops/inbound", window.location.origin);
            if (filterWh) url.searchParams.append("warehouse_id", filterWh);
            if (filterCust) url.searchParams.append("customer_id", filterCust);

            const res = await fetchWithAuth(url.toString());
            setData(await res.json());
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
                        <Truck className="text-teal-500" size={28} />
                        Inbound Operations / الواردات
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Manage and monitor incoming stock</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg active:scale-95"
                >
                    <Truck size={20} /> New Inbound (GRN) / استلام جديد
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Warehouse</label>
                    <select className="form-input w-full" value={filterWh} onChange={e => setFilterWh(e.target.value)}>
                        <option value="">All Warehouses</option>
                        {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Customer</label>
                    <select className="form-input w-full" value={filterCust} onChange={e => setFilterCust(e.target.value)}>
                        <option value="">All Customers</option>
                        {customers.map((c: any) => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Doc #</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Warehouse</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (Qty)</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 text-xs font-bold text-slate-500">
                                        {new Date(item.timestamp).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 font-black text-slate-700 text-sm">
                                        {item.source_document_id || "GRN-001"}
                                    </td>
                                    <td className="p-4 text-sm font-bold text-slate-600">
                                        {warehouses.find((w: any) => w.id === item.warehouse_id)?.name || item.warehouse_id}
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-teal-50 text-teal-600 px-3 py-1 rounded-full text-xs font-black">
                                            +{item.quantity}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs font-mono text-slate-400">{item.item_id}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <InboundForm
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); loadInbound(); }}
                    warehouses={warehouses}
                    suppliers={suppliers}
                    products={products}
                    accounts={accounts}
                />
            )}
        </div>
    );
}

function InboundForm({ onClose, onSuccess, warehouses, suppliers, products, accounts }: any) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        number: `GRN-${Math.floor(Math.random() * 9000) + 1000}`,
        supplier_id: "",
        supplier_account_id: "",
        lines: [] as any[]
    });

    const [lineInput, setLineInput] = useState({
        item_id: "",
        warehouse_id: "",
        quantity: "1",
        unit_cost: "0",
        batch_number: ""
    });
    const [currentStock, setCurrentStock] = useState<number | null>(null);
    const [loadingStock, setLoadingStock] = useState(false);

    useEffect(() => {
        if (lineInput.item_id) {
            setLoadingStock(true);
            const warehouseParam = lineInput.warehouse_id ? `&warehouse_id=${lineInput.warehouse_id}` : '';
            fetchWithAuth(`/api/warehouse/ops/stock?item_id=${lineInput.item_id}${warehouseParam}`)
                .then(res => res.json())
                .then(data => setCurrentStock(data.balance))
                .catch(err => console.error("Error fetching stock", err))
                .finally(() => setLoadingStock(false));
        } else {
            setCurrentStock(null);
        }
    }, [lineInput.item_id, lineInput.warehouse_id]);

    // Auto-select supplier account when supplier is selected (mock logic or just select first payable if none)
    // Actually, we'll let user select or default to first liability account
    useEffect(() => {
        if (!formData.supplier_account_id && accounts.length > 0) {
            setFormData(prev => ({ ...prev, supplier_account_id: accounts[0].id }));
        }
    }, [accounts]);

    const handleAddLine = () => {
        if (!lineInput.item_id || !lineInput.warehouse_id) return;
        setFormData({ ...formData, lines: [...formData.lines, lineInput] });
        // Reset inputs but keep warehouse (likely same)
        setLineInput({ ...lineInput, item_id: "", quantity: "1", unit_cost: "0", batch_number: "" });
        setCurrentStock(null);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/warehouse/ops/inbound", {
                method: "POST",
                body: JSON.stringify(formData)
            });
            if (res.ok) onSuccess();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
                    <h3 className="text-lg font-black tracking-tight flex items-center gap-2"><Truck size={20} /> New Inbound (GRN) / استلام بضاعة</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Search size={20} className="hidden" /> X</button>
                </div>

                <div className="p-8 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">GRN #</label>
                            <input readOnly className="form-input w-full bg-slate-50 font-mono font-bold" value={formData.number} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Supplier</label>
                            <div className="flex gap-2">
                                <select className="form-input w-full font-bold" value={formData.supplier_id} onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}>
                                    <option value="">- Select Supplier -</option>
                                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Payable Account</label>
                            <select className="form-input w-full font-bold" value={formData.supplier_account_id} onChange={e => setFormData({ ...formData, supplier_account_id: e.target.value })}>
                                <option value="">- Select Account -</option>
                                {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Add Items</p>
                        <div className="grid grid-cols-12 gap-3 items-end">
                            <div className="col-span-12 md:col-span-4">
                                <label className="text-[9px] font-bold text-slate-400 block mb-1">Item</label>
                                <select className="form-input w-full text-sm font-bold" value={lineInput.item_id} onChange={e => setLineInput({ ...lineInput, item_id: e.target.value })}>
                                    <option value="">- Item -</option>
                                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                {lineInput.item_id && (
                                    <div className="mt-1 px-1">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                                            {loadingStock ? "Checking stock..." : `Available: ${currentStock ?? 0} units @ ${warehouses.find((w: any) => w.id === lineInput.warehouse_id)?.name || 'Global'}`}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="col-span-12 md:col-span-3">
                                <label className="text-[9px] font-bold text-slate-400 block mb-1">Warehouse</label>
                                <select className="form-input w-full text-sm font-bold" value={lineInput.warehouse_id} onChange={e => setLineInput({ ...lineInput, warehouse_id: e.target.value })}>
                                    <option value="">- WH -</option>
                                    {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-6 md:col-span-2">
                                <label className="text-[9px] font-bold text-slate-400 block mb-1">Qty</label>
                                <input type="number" className="form-input w-full text-sm font-bold" placeholder="1" value={lineInput.quantity} onChange={e => setLineInput({ ...lineInput, quantity: e.target.value })} />
                            </div>
                            <div className="col-span-6 md:col-span-2">
                                <label className="text-[9px] font-bold text-slate-400 block mb-1">Cost</label>
                                <input type="number" className="form-input w-full text-sm font-bold" placeholder="0.00" value={lineInput.unit_cost} onChange={e => setLineInput({ ...lineInput, unit_cost: e.target.value })} />
                            </div>
                            <div className="col-span-12 md:col-span-1">
                                <button onClick={handleAddLine} className="w-full bg-teal-500 text-white h-10 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">+</button>
                            </div>
                            <div className="col-span-12">
                                <input className="form-input w-full text-sm" placeholder="Batch Number (Optional)" value={lineInput.batch_number} onChange={e => setLineInput({ ...lineInput, batch_number: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {formData.lines.map((l, i) => (
                            <div key={i} className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                                <div>
                                    <p className="font-black text-slate-800 text-sm">{products.find((p: any) => p.id === l.item_id)?.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        WH: {warehouses.find((w: any) => w.id === l.warehouse_id)?.name} | Batch: {l.batch_number || "N/A"}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="block bg-teal-50 text-teal-600 px-3 py-1 rounded-lg font-black text-sm">+{l.quantity}</span>
                                    <span className="text-[10px] text-slate-400 font-mono font-bold">@ {l.unit_cost}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || formData.lines.length === 0}
                        className="bg-primary text-white px-10 py-3 rounded-2xl font-black shadow-lg hover:shadow-primary/20"
                    >
                        {loading ? "Processing..." : "Confirm GRN"}
                    </button>
                </div>
            </div>
        </div>
    );
}
