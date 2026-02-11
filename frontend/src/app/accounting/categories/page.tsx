"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, X, Tag, ToggleLeft, ToggleRight, Trash2, Edit3, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function CategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [authUser, setAuthUser] = useState<User | null>(null);

    const [formData, setFormData] = useState({
        name_en: "",
        name_ar: "",
        description: "",
        active: true,
    });

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    const fetchCategories = useCallback(async () => {
        if (!authReady || !authUser) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            const res = await fetchWithAuth(`/api/accounting/categories?${params}`);
            if (res.ok) {
                const data = await res.json();
                setCategories(data.categories || []);
            }
        } catch (e) {
            console.error("Failed to fetch categories:", e);
        } finally {
            setLoading(false);
        }
    }, [authReady, authUser, search]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const resetForm = () => {
        setFormData({ name_en: "", name_ar: "", description: "", active: true });
        setEditingId(null);
    };

    const openCreate = () => {
        resetForm();
        setShowModal(true);
    };

    const openEdit = (cat: any) => {
        setFormData({
            name_en: cat.name_en || "",
            name_ar: cat.name_ar || "",
            description: cat.description || "",
            active: cat.active !== false,
        });
        setEditingId(cat.id);
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!formData.name_en && !formData.name_ar) {
            alert("Please enter a category name.");
            return;
        }
        try {
            const url = editingId
                ? `/api/accounting/categories/${editingId}`
                : "/api/accounting/categories";
            const method = editingId ? "PUT" : "POST";

            const res = await fetchWithAuth(url, {
                method,
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setShowModal(false);
                resetForm();
                fetchCategories();
            } else {
                const err = await res.json();
                alert("Error: " + (err.detail || "Unknown error"));
            }
        } catch (e) {
            alert("Failed to save category");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this category?")) return;
        try {
            const res = await fetchWithAuth(`/api/accounting/categories/${id}`, { method: "DELETE" });
            if (res.ok) fetchCategories();
        } catch (e) {
            alert("Failed to delete category");
        }
    };

    const formatDate = (d: any) => {
        if (!d) return "-";
        if (d._seconds) return new Date(d._seconds * 1000).toLocaleDateString();
        if (typeof d === "string") return new Date(d).toLocaleDateString();
        return "-";
    };

    if (!authReady) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-violet-600 text-white rounded-2xl shadow-lg shadow-violet-200">
                        <Tag size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800">Categories / التصنيفات</h2>
                        <p className="text-slate-500 text-sm">Manage accounting categories</p>
                    </div>
                </div>
                <button
                    onClick={openCreate}
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 text-sm"
                >
                    <Plus size={18} /> Add Category
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search categories..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Name (EN)</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Name (AR)</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Description</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Created</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading...</td></tr>
                        ) : categories.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">No categories found.</td></tr>
                        ) : (
                            categories.map((cat) => (
                                <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-slate-800">{cat.name_en || "-"}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-600 font-['Noto_Sans_Arabic']" dir="rtl">{cat.name_ar || "-"}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{cat.description || "-"}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${cat.active !== false ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                                            {cat.active !== false ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(cat.created_at)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openEdit(cat)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Edit">
                                                <Edit3 size={15} className="text-slate-500" />
                                            </button>
                                            <button onClick={() => handleDelete(cat.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                <Trash2 size={15} className="text-red-400" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900">
                                {editingId ? "Edit Category" : "New Category"}
                            </h2>
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name (English)</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-500"
                                    placeholder="e.g. Office Supplies"
                                    value={formData.name_en}
                                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name (Arabic) / الاسم بالعربي</label>
                                <input
                                    type="text"
                                    dir="rtl"
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-500"
                                    placeholder="مثال: لوازم مكتبية"
                                    value={formData.name_ar}
                                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                <textarea
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 h-24 resize-none"
                                    placeholder="Optional description..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-600">Active</label>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                                    className="flex items-center gap-2"
                                >
                                    {formData.active ? (
                                        <ToggleRight size={32} className="text-emerald-500" />
                                    ) : (
                                        <ToggleLeft size={32} className="text-slate-300" />
                                    )}
                                </button>
                            </div>

                            <button
                                onClick={handleSubmit}
                                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95"
                            >
                                {editingId ? "Update Category" : "Create Category"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
