"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Book, Plus, Search, Filter, Calendar,
    ChevronRight, ArrowUpRight, ArrowDownLeft,
    FileText, User, MoreVertical, RefreshCw
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { auth } from "@/lib/firebase";
import JournalEntryForm from "@/components/JournalEntryForm";
import JournalDetailModal from "@/components/JournalDetailModal";
import SuccessModal from "@/components/SuccessModal";

export default function JournalsPage() {
    const { t, locale } = useLanguage();
    const [journals, setJournals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [showForm, setShowForm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [selectedJournal, setSelectedJournal] = useState<any>(null);

    const fetchJournals = useCallback(async () => {
        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/accounting/journals", {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setJournals(data);
                console.log("Fetched journals:", data.length);
            } else {
                console.error("Journals API returned non-array response:", data);
            }
        } catch (e) {
            console.error("Fetch journals error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) fetchJournals();
        });
        return () => unsubscribe();
    }, [fetchJournals]);

    const filteredJournals = journals.filter(je => {
        const matchesSearch = je.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            je.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || je.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "POSTED": return "bg-emerald-100 text-emerald-800 border-emerald-200";
            case "DRAFT": return "bg-amber-100 text-amber-800 border-amber-200";
            case "VOIDED": return "bg-rose-100 text-rose-800 border-rose-200";
            default: return "bg-slate-100 text-slate-800 border-slate-200";
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-600 shadow-xl shadow-indigo-200 rounded-3xl text-white transform rotate-3">
                        <Book size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            {locale === 'ar' ? "قيود اليومية" : "Journal Entries"}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-slate-500 text-xs font-black uppercase tracking-widest leading-none">Double-Entry Ledger</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setShowForm(true)}
                    className="group bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-indigo-700 hover:-translate-y-1 transition-all shadow-2xl shadow-indigo-500/30 active:scale-95"
                >
                    <div className="bg-white/20 p-1 rounded-lg group-hover:rotate-90 transition-transform duration-300">
                        <Plus size={18} />
                    </div>
                    {locale === 'ar' ? "إضافة قيد يومي" : "Add Daily Entry"}
                </button>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-6 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                    <input
                        className="w-full bg-white border border-slate-200 pl-12 pr-4 py-4 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        placeholder={locale === 'ar' ? "البحث برقم القيد أو الوصف..." : "Search by number or description..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="lg:col-span-3 flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-2xl shadow-sm">
                    <Filter size={18} className="text-slate-400" />
                    <select
                        className="flex-1 bg-transparent border-none font-black text-xs text-slate-600 uppercase tracking-widest outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="POSTED">Posted</option>
                        <option value="DRAFT">Draft</option>
                        <option value="VOIDED">Voided</option>
                    </select>
                </div>
                <div className="lg:col-span-3 flex items-center gap-3 justify-end pr-2">
                    <button
                        onClick={fetchJournals}
                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        Showing {filteredJournals.length} entries
                    </p>
                </div>
            </div>

            {/* Journals List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    Array(5).fill(0).map((_, i) => (
                        <div key={i} className="animate-pulse bg-white p-6 rounded-3xl border border-slate-100 h-28"></div>
                    ))
                ) : filteredJournals.length > 0 ? (
                    filteredJournals.map((je: any) => (
                        <div
                            key={je.id}
                            onClick={() => setSelectedJournal(je)}
                            className="group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 flex flex-col md:flex-row items-start md:items-center gap-6 cursor-pointer"
                        >
                            <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                <FileText size={24} />
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="font-black text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">
                                        {je.number}
                                    </h3>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${getStatusStyle(je.status)}`}>
                                        {je.status}
                                    </span>
                                </div>
                                <p className="text-slate-400 text-sm font-bold truncate max-w-md">
                                    {je.description || "No description provided"}
                                </p>
                            </div>

                            <div className="flex items-center gap-8 px-4 border-l border-slate-50 hidden md:flex">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Date</p>
                                    <p className="text-sm font-black text-slate-600">
                                        {new Date(je.date).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-right min-w-[120px]">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Impact</p>
                                    <p className="text-lg font-black text-indigo-700 tabular-nums">
                                        {je.lines?.reduce((acc: number, l: any) => acc + Number(l.debit || 0), 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button className="p-3 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                                    <MoreVertical size={20} />
                                </button>
                                <div className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                        <div className="mx-auto w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                            <Book size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800">No Journal Entries Found</h3>
                        <p className="text-slate-400 text-sm font-bold mt-2">Start by adding your first accounting record.</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="mt-6 text-indigo-600 font-black text-sm hover:underline"
                        >
                            Create Daily Entry
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showForm && (
                <JournalEntryForm
                    onClose={() => setShowForm(false)}
                    onSuccess={() => {
                        fetchJournals();
                        setShowForm(false);
                        setShowSuccess(true);
                    }}
                />
            )}

            {showSuccess && (
                <SuccessModal
                    title={locale === 'ar' ? "تم بنجاح!" : "Success!"}
                    message={locale === 'ar' ? "تم ترحيل القيد اليومي بنجاح" : "Journal Entry has been posted successfully."}
                    onClose={() => setShowSuccess(false)}
                />
            )}

            {selectedJournal && (
                <JournalDetailModal
                    journal={selectedJournal}
                    onClose={() => setSelectedJournal(null)}
                />
            )}
        </div>
    );
}
