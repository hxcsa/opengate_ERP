"use client";

import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    Plus, Trash2, Search, Save, Send, ArrowLeft,
    Calendar, Clock, Truck, FileText, X
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface LineItem {
    product_id: string;
    product_name: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount: number;
    total: number;
}

const EMPTY_LINE: LineItem = {
    product_id: "", product_name: "", description: "",
    quantity: 1, unit_price: 0, discount: 0, total: 0
};

export default function NewInvoicePage() {
    const router = useRouter();
    const { t } = useLanguage();

    // Auth
    const [authUser, setAuthUser] = useState<User | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [role, setRole] = useState("viewer");

    // Data sources
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [custSearch, setCustSearch] = useState("");
    const [prodSearches, setProdSearches] = useState<string[]>([""]);
    const [showCustDrop, setShowCustDrop] = useState(false);
    const [showProdDrop, setShowProdDrop] = useState<number | null>(null);

    // Invoice form
    const [form, setForm] = useState({
        customer_id: "",
        customer_name: "",
        warehouse_id: "",
        warehouse_name: "",
        invoice_type: "sale",
        time: "",
        driver_name: "",
        vehicle_info: "",
        important_notes: "",
        notes: "",
        due_days: 30,
    });
    const [lines, setLines] = useState<LineItem[]>([{ ...EMPTY_LINE }]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Computed
    const today = new Date().toISOString().split("T")[0];
    const dueDate = new Date(Date.now() + (form.due_days || 30) * 86400000).toISOString().split("T")[0];
    const subtotal = lines.reduce((s, l) => s + (l.quantity * l.unit_price), 0);
    const discountTotal = lines.reduce((s, l) => s + l.discount, 0);
    const total = subtotal - discountTotal;

    // Auth listener
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            setAuthUser(user);
            setAuthReady(true);
            if (user) {
                try {
                    const t = await user.getIdTokenResult();
                    if (t.claims.role) setRole(t.claims.role as string);
                } catch { }
            }
        });
        return () => unsub();
    }, []);



    // Load data sources once authenticated
    useEffect(() => {
        if (!authReady || !authUser) return;
        (async () => {
            try {
                const [custRes, prodRes, whRes] = await Promise.all([
                    fetchWithAuth("/api/customers?page_size=500"),
                    fetchWithAuth("/api/items"),
                    fetchWithAuth("/api/warehouses"),
                ]);
                if (custRes.ok) {
                    const d = await custRes.json();
                    setCustomers(d.customers || d || []);
                }
                if (prodRes.ok) {
                    const d = await prodRes.json();
                    setProducts(Array.isArray(d) ? d : d.items || []);
                }
                if (whRes.ok) {
                    const d = await whRes.json();
                    setWarehouses(Array.isArray(d) ? d : []);
                }
            } catch (e) {
                console.error("Failed to load data:", e);
            }
        })();
    }, [authReady, authUser]);

    // Line item helpers
    const updateLine = (idx: number, field: string, value: any) => {
        setLines(prev => {
            const updated = [...prev];
            (updated[idx] as any)[field] = value;
            updated[idx].total = updated[idx].quantity * updated[idx].unit_price - updated[idx].discount;
            return updated;
        });
    };

    const addLine = () => {
        setLines(prev => [...prev, { ...EMPTY_LINE }]);
        setProdSearches(prev => [...prev, ""]);
    };

    const removeLine = (idx: number) => {
        if (lines.length <= 1) return;
        setLines(prev => prev.filter((_, i) => i !== idx));
        setProdSearches(prev => prev.filter((_, i) => i !== idx));
    };

    const selectProduct = (idx: number, product: any) => {
        const price = Number(product.selling_price || product.current_wac || 0);
        updateLine(idx, "product_id", product.id);
        updateLine(idx, "product_name", product.name);
        updateLine(idx, "unit_price", price);
        updateLine(idx, "description", product.name);
        setProdSearches(prev => { const u = [...prev]; u[idx] = product.name; return u; });
        setShowProdDrop(null);
    };

    // Save
    const handleSave = async (action: "draft" | "issue") => {
        setError(null);
        // Validations
        if (!form.customer_id) { setError("Customer is required"); return; }
        if (!form.warehouse_id) { setError("Warehouse is required"); return; }
        if (lines.length === 0 || lines.every(l => !l.product_id && !l.description)) {
            setError("At least one line item is required"); return;
        }
        for (const l of lines) {
            if (l.quantity <= 0) { setError("All quantities must be > 0"); return; }
            if (l.unit_price < 0) { setError("Unit price cannot be negative"); return; }
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                issue_date: new Date().toISOString(),
                due_date: new Date(Date.now() + form.due_days * 86400000).toISOString(),
                lines: lines.map(l => ({
                    product_id: l.product_id,
                    description: l.description || l.product_name,
                    quantity: l.quantity,
                    unit_price: l.unit_price,
                    discount: l.discount,
                    total: l.quantity * l.unit_price - l.discount,
                })),
                subtotal,
                discount_total: discountTotal,
                total,
            };

            const res = await fetchWithAuth("/api/sales/invoices", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || "Failed to create invoice");
            }
            const result = await res.json();

            // Optionally issue immediately
            if (action === "issue" && result.id) {
                const issueRes = await fetchWithAuth(`/api/sales/invoices/${result.id}/issue`, {
                    method: "POST"
                });
                if (!issueRes.ok) {
                    console.warn("Created but failed to issue");
                }
            }

            router.push("/invoices");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const canIssue = role === "admin" || role === "accountant";

    // Filter helpers
    const filteredCustomers = customers.filter(c => {
        const s = custSearch.toLowerCase();
        if (!s) return true;
        const name = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
        return name.includes(s) || (c.phone || "").includes(s) || (c.company_name || "").toLowerCase().includes(s);
    });

    const filteredProducts = (idx: number) => {
        const s = (prodSearches[idx] || "").toLowerCase();
        if (!s) return products;
        return products.filter(p =>
            (p.name || "").toLowerCase().includes(s) || (p.sku || "").includes(s)
        );
    };

    const fmtIQD = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    if (!authReady) return <div className="p-8 text-center text-slate-400">Loading...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/invoices")} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">Create Invoice / إنشاء فاتورة</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">New Sales Invoice</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm font-medium flex items-center gap-2">
                    <X size={16} /> {error}
                </div>
            )}

            {/* A) Header Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
                <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={16} /> Invoice Details / تفاصيل الفاتورة
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Issue Date */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Issue Date / تاريخ الأصدار</label>
                        <input type="date" value={today} readOnly className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono cursor-not-allowed" />
                    </div>
                    {/* Due Days */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Due in (days) / المستحق خلال</label>
                        <select
                            value={form.due_days}
                            onChange={(e) => setForm(f => ({ ...f, due_days: Number(e.target.value) }))}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                        >
                            <option value={7}>7 days</option>
                            <option value={14}>14 days</option>
                            <option value={30}>30 days</option>
                            <option value={60}>60 days</option>
                            <option value={90}>90 days</option>
                        </select>
                    </div>
                    {/* Due Date */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Due Date / تاريخ الأستحقاق</label>
                        <input type="date" value={dueDate} readOnly className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono cursor-not-allowed" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Search */}
                    <div className="relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Customer / الزبون *</label>
                        <input
                            type="text"
                            value={custSearch || form.customer_name}
                            onChange={(e) => { setCustSearch(e.target.value); setShowCustDrop(true); setForm(f => ({ ...f, customer_id: "", customer_name: "" })); }}
                            onFocus={() => setShowCustDrop(true)}
                            placeholder="Search customers..."
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {showCustDrop && filteredCustomers.length > 0 && (
                            <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                {filteredCustomers.slice(0, 8).map(c => (
                                    <div key={c.id} onClick={() => {
                                        setForm(f => ({ ...f, customer_id: c.id, customer_name: `${c.first_name} ${c.last_name}` }));
                                        setCustSearch("");
                                        setShowCustDrop(false);
                                    }} className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0">
                                        <div className="font-bold text-sm">{c.first_name} {c.last_name}</div>
                                        <div className="text-[10px] text-slate-400">{c.phone} {c.company_name ? `· ${c.company_name}` : ""}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {form.customer_name && (
                            <div className="mt-1 text-xs text-emerald-600 font-bold">✓ {form.customer_name}</div>
                        )}
                    </div>

                    {/* Warehouse */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Warehouse / المخزن *</label>
                        <select
                            value={form.warehouse_id}
                            onChange={(e) => {
                                const wh = warehouses.find((w: any) => w.id === e.target.value);
                                setForm(f => ({ ...f, warehouse_id: e.target.value, warehouse_name: wh?.name || "" }));
                            }}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                        >
                            <option value="">Select warehouse...</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Invoice Type */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Invoice Type / نوع الفاتورة</label>
                        <select value={form.invoice_type} onChange={e => setForm(f => ({ ...f, invoice_type: e.target.value }))}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold">
                            <option value="sale">Sale / بيع</option>
                            <option value="delivery">Delivery / توصيل</option>
                            <option value="service">Service / خدمة</option>
                        </select>
                    </div>
                    {/* Time */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Time / الوقت</label>
                        <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold" />
                    </div>
                    {/* Driver */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Driver / السائق</label>
                        <input type="text" value={form.driver_name} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))}
                            placeholder="Driver name" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Vehicle */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vehicle / السيارة</label>
                        <input type="text" value={form.vehicle_info} onChange={e => setForm(f => ({ ...f, vehicle_info: e.target.value }))}
                            placeholder="Plate / Car name" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold" />
                    </div>
                    {/* Important Notes */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Important Notes / ملاحظات مهمة</label>
                        <textarea value={form.important_notes} onChange={e => setForm(f => ({ ...f, important_notes: e.target.value }))}
                            rows={2} placeholder="Important notes appear at top of invoice"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold resize-none" />
                    </div>
                </div>
            </div>

            {/* B) Line Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest">Line Items / البنود</h2>
                    <button onClick={addLine} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all active:scale-95">
                        <Plus size={14} /> Add Item
                    </button>
                </div>

                {/* Table header */}
                <div className="hidden md:grid grid-cols-12 gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                    <div className="col-span-4">Product / المنتج</div>
                    <div className="col-span-2">Qty / الكمية</div>
                    <div className="col-span-2">Price (IQD)</div>
                    <div className="col-span-2">Discount</div>
                    <div className="col-span-1 text-right">Total</div>
                    <div className="col-span-1"></div>
                </div>

                {lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                        {/* Product search */}
                        <div className="col-span-12 md:col-span-4 relative">
                            <input
                                type="text"
                                value={prodSearches[idx] || ""}
                                onChange={e => {
                                    setProdSearches(p => { const u = [...p]; u[idx] = e.target.value; return u; });
                                    setShowProdDrop(idx);
                                }}
                                onFocus={() => setShowProdDrop(idx)}
                                placeholder="Search product..."
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                            />
                            {showProdDrop === idx && filteredProducts(idx).length > 0 && (
                                <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                                    {filteredProducts(idx).slice(0, 6).map(p => (
                                        <div key={p.id} onClick={() => selectProduct(idx, p)}
                                            className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0">
                                            <div className="font-bold text-sm">{p.name}</div>
                                            <div className="text-[10px] text-slate-400">{p.sku} · IQD {fmtIQD(Number(p.selling_price || p.current_wac || 0))}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Quantity */}
                        <div className="col-span-4 md:col-span-2">
                            <input type="number" min="1" value={line.quantity}
                                onChange={e => updateLine(idx, "quantity", Number(e.target.value))}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-center" />
                        </div>
                        {/* Price */}
                        <div className="col-span-4 md:col-span-2">
                            <input type="number" min="0" value={line.unit_price}
                                onChange={e => updateLine(idx, "unit_price", Number(e.target.value))}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-right font-mono" />
                        </div>
                        {/* Discount */}
                        <div className="col-span-4 md:col-span-2">
                            <input type="number" min="0" value={line.discount}
                                onChange={e => updateLine(idx, "discount", Number(e.target.value))}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-right font-mono" />
                        </div>
                        {/* Line total */}
                        <div className="col-span-6 md:col-span-1 flex items-center justify-end">
                            <span className="text-sm font-black text-slate-700 font-mono">
                                {fmtIQD(line.quantity * line.unit_price - line.discount)}
                            </span>
                        </div>
                        {/* Remove */}
                        <div className="col-span-6 md:col-span-1 flex items-center justify-end">
                            <button onClick={() => removeLine(idx)} disabled={lines.length <= 1}
                                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* C) Totals + D) Footer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Notes */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Notes / ملاحظات</label>
                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        rows={4} placeholder="Additional notes..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" />
                </div>

                {/* Totals */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-bold">Subtotal / المجموع الفرعي</span>
                        <span className="font-black font-mono">{fmtIQD(subtotal)} IQD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-bold">Discount / الخصم</span>
                        <span className="font-black text-rose-500 font-mono">-{fmtIQD(discountTotal)} IQD</span>
                    </div>
                    <hr className="border-slate-100" />
                    <div className="flex justify-between text-lg">
                        <span className="text-slate-800 font-black">Total / المجموع</span>
                        <span className="font-black text-emerald-600 font-mono">{fmtIQD(total)} IQD</span>
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pb-8">
                <button onClick={() => router.push("/invoices")} className="px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                    Cancel / إلغاء
                </button>
                <button onClick={() => handleSave("draft")} disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl text-sm font-black hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50">
                    <Save size={16} /> {saving ? "Saving..." : "Save Draft / حفظ كمسودة"}
                </button>
                {canIssue && (
                    <button onClick={() => handleSave("issue")} disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50">
                        <Send size={16} /> {saving ? "Saving..." : "Issue / إصدار"}
                    </button>
                )}
            </div>
        </div>
    );
}
