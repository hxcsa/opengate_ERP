"use client";
import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api";
import { LogOut, Package, Calendar, User, Search, Filter } from "lucide-react";

export default function OutboundPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);

    const [filterWh, setFilterWh] = useState("");
    const [filterCust, setFilterCust] = useState("");

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        loadOutbound();
    }, [filterWh, filterCust]);

    const [showForm, setShowForm] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);

    const loadInitialData = async () => {
        const [whRes, custRes, prodRes, accRes] = await Promise.all([
            fetchWithAuth("/api/warehouse/warehouses"),
            fetchWithAuth("/api/customers"),
            fetchWithAuth("/api/warehouse/products"),
            fetchWithAuth("/api/accounting/accounts?type=ASSET") // Receivable is Asset
        ]);
        setWarehouses(await whRes.json());
        setCustomers((await custRes.json()).customers || []);
        setProducts(await prodRes.json());
        setAccounts(await accRes.json());
    };

    const loadOutbound = async () => {
        setLoading(true);
        try {
            const url = new URL("/api/warehouse/ops/outbound", window.location.origin);
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
                        <LogOut className="text-rose-500" size={28} />
                        Outbound Operations / الصادرات
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Manage and monitor outgoing stock</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg active:scale-95"
                >
                    <LogOut size={20} /> New Outbound (DO)
                </button>
            </div>

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
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Warehouse</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Doc #</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 text-xs font-bold text-slate-500">
                                        {new Date(item.timestamp).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-sm font-bold text-slate-600">
                                        {warehouses.find((w: any) => w.id === item.warehouse_id)?.name || item.warehouse_id}
                                    </td>
                                    <td className="p-4 text-sm font-black text-primary">
                                        {customers.find((c: any) => c.id === item.customer_id)?.company_name || (filterCust ? customers.find((c: any) => c.id === filterCust)?.company_name : "General")}
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-black">
                                            {item.quantity}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs font-mono text-slate-400">{item.source_document_id}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <OutboundForm
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); loadOutbound(); }}
                    warehouses={warehouses}
                    customers={customers}
                    products={products}
                    accounts={accounts}
                />
            )}
        </div>
    );
}

function OutboundForm({ onClose, onSuccess, warehouses, customers, products, accounts }: any) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        number: `DO-${Math.floor(Math.random() * 9000) + 1000}`,
        customer_account_id: "",
        lines: [] as any[]
    });
    const [selectedCustomer, setSelectedCustomer] = useState("");

    const [lineInput, setLineInput] = useState({
        item_id: "",
        warehouse_id: "",
        quantity: "1",
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

    useEffect(() => {
        // If customer is selected and we have accounts, try to find a receivable account?
        // Basic logic: Select first ASSET/RECEIVABLE account if not set
        if (!formData.customer_account_id && accounts.length > 0) {
            setFormData(prev => ({ ...prev, customer_account_id: accounts[0].id }));
        }
    }, [accounts]);

    const handleAddLine = () => {
        if (!lineInput.item_id || !lineInput.warehouse_id) return;
        setFormData({ ...formData, lines: [...formData.lines, lineInput] });
        setLineInput({ ...lineInput, item_id: "", quantity: "1", batch_number: "" });
        setCurrentStock(null);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/warehouse/ops/outbound", {
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
                    <h3 className="text-lg font-black tracking-tight flex items-center gap-2"><LogOut size={20} /> New Outbound (Delivery Note)</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">X</button>
                </div>

                <div className="p-8 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">DO #</label>
                            <input readOnly className="form-input w-full bg-slate-50 font-mono font-bold" value={formData.number} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Customer (Internal ref)</label>
                            {/* Note: DeliveryNoteCreate schema doesn't have customer_id, only customer_account_id.
                                But practical apps usually link to customer. 
                                The current schema only uses customer_account_id for accounting.
                                We'll just select the account. 
                                Ideally, we should select Customer -> Get their account.
                            */}
                            <select className="form-input w-full font-bold" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                                <option value="">- Select Customer -</option>
                                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Receivable Account</label>
                            <select className="form-input w-full font-bold" value={formData.customer_account_id} onChange={e => setFormData({ ...formData, customer_account_id: e.target.value })}>
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
                                            {loadingStock ? "Checking stock..." : `Available: ${currentStock ?? 0} units @ ${warehouses.find(w => w.id === lineInput.warehouse_id)?.name || 'Global'}`}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="col-span-12 md:col-span-3">
                                <label className="text-[9px] font-bold text-slate-400 block mb-1">From Warehouse</label>
                                <select className="form-input w-full text-sm font-bold" value={lineInput.warehouse_id} onChange={e => setLineInput({ ...lineInput, warehouse_id: e.target.value })}>
                                    <option value="">- WH -</option>
                                    {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-12 md:col-span-2">
                                <label className="text-[9px] font-bold text-slate-400 block mb-1">Qty</label>
                                <input type="number" className="form-input w-full text-sm font-bold" placeholder="1" value={lineInput.quantity} onChange={e => setLineInput({ ...lineInput, quantity: e.target.value })} />
                            </div>
                            <div className="col-span-12 md:col-span-1">
                                <button onClick={handleAddLine} className="w-full bg-rose-500 text-white h-10 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">+</button>
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
                                <span className="block bg-rose-50 text-rose-600 px-3 py-1 rounded-lg font-black text-sm">{l.quantity}</span>
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
                        {loading ? "Processing..." : "Confirm Delivery"}
                    </button>
                </div>
            </div>
        </div>
    );
}
