"use client";

import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
    Search, Filter, Calendar, BookOpen,
    ChevronRight, ArrowUpRight, ArrowDownRight,
    TrendingUp, TrendingDown, Clock, Loader2
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Account } from "@/app/accounting/types";
import { fetchWithAuth } from "@/lib/api";

interface LedgerItem {
    id: string;
    date: string;
    number: string;
    description: string;
    memo: string;
    debit: string;
    credit: string;
    balance: string;
}

interface LedgerResponse {
    account: {
        code: string;
        name_ar: string;
        name_en: string;
        type: string;
    };
    opening_balance: string;
    items: LedgerItem[];
    total_debit: string;
    total_credit: string;
    closing_balance: string;
}

export default function GeneralLedgerPage() {
    const { locale } = useLanguage();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [fromDate, setFromDate] = useState<string>(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [ledgerData, setLedgerData] = useState<LedgerResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetchingAccounts, setFetchingAccounts] = useState(true);
    const [authReady, setAuthReady] = useState(false);
    const [authUser, setAuthUser] = useState<User | null>(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    const fetchAccounts = useCallback(async () => {
        if (!authReady || !authUser) return;
        setFetchingAccounts(true);
        try {
            const res = await fetchWithAuth("/api/accounts");
            if (res.ok) {
                const data = await res.json();
                const list = data.accounts || (Array.isArray(data) ? data : []);
                setAccounts(list);
                // Auto-select first transactional account if none selected
                if (!selectedAccountId && list.length > 0) {
                    const firstTransactional = list.find((a: any) => !a.is_group);
                    if (firstTransactional) setSelectedAccountId(firstTransactional.id);
                }
            }
        } catch (err) {
            console.error("Failed to fetch accounts:", err);
        } finally {
            setFetchingAccounts(false);
        }
    }, [authReady, authUser, selectedAccountId]);

    const fetchLedger = useCallback(async () => {
        if (!selectedAccountId) return;
        setLoading(true);
        try {
            const url = `/api/reports/general-ledger?account_id=${selectedAccountId}&from_date=${fromDate}&to_date=${toDate}`;
            const res = await fetchWithAuth(url);
            if (res.ok) {
                const data = await res.json();
                setLedgerData(data);
            }
        } catch (err) {
            console.error("Failed to fetch ledger:", err);
        } finally {
            setLoading(false);
        }
    }, [authReady, authUser, selectedAccountId, fromDate, toDate]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    useEffect(() => {
        if (selectedAccountId) fetchLedger();
    }, [selectedAccountId, fetchLedger]);

    const formatCurrency = (val: string | number) => {
        const num = Number(val);
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    if (!authReady) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                            <BookOpen className="text-blue-600" size={32} />
                            {locale === 'ar' ? "دفتر الأستاذ العام" : "General Ledger"}
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">
                            {locale === 'ar' ? "سجل الحركات التفصيلي للحساب" : "Detailed transaction history & running balance"}
                        </p>
                    </div>
                </div>

                {/* Filters Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Account Selector */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                <Search size={14} />
                                {locale === 'ar' ? "اختر الحساب" : "Select Account"}
                            </label>
                            <select
                                value={selectedAccountId}
                                onChange={(e) => setSelectedAccountId(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            >
                                {fetchingAccounts ? (
                                    <option>Loading accounts...</option>
                                ) : (
                                    accounts.map(acc => (
                                        <option key={acc.id} value={acc.id} disabled={acc.is_group}>
                                            {acc.code} - {locale === 'ar' ? acc.name_ar : acc.name_en} {acc.is_group ? '(Group)' : ''}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* Date From */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                <Calendar size={14} />
                                {locale === 'ar' ? "من تاريخ" : "From Date"}
                            </label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>

                        {/* Date To */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                <Calendar size={14} />
                                {locale === 'ar' ? "إلى تاريخ" : "To Date"}
                            </label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {ledgerData && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Opening Balance</p>
                                <p className="text-2xl font-black text-slate-800 font-mono tracking-tighter">
                                    {formatCurrency(ledgerData.opening_balance)}
                                </p>
                            </div>
                            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Total Debits</p>
                                    <TrendingUp size={16} className="text-emerald-500" />
                                </div>
                                <p className="text-2xl font-black text-emerald-700 font-mono tracking-tighter">
                                    {formatCurrency(ledgerData.total_debit)}
                                </p>
                            </div>
                            <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-[10px] font-black uppercase text-rose-600 tracking-widest">Total Credits</p>
                                    <TrendingDown size={16} className="text-rose-500" />
                                </div>
                                <p className="text-2xl font-black text-rose-700 font-mono tracking-tighter">
                                    {formatCurrency(ledgerData.total_credit)}
                                </p>
                            </div>
                            <div className="bg-blue-600 p-6 rounded-3xl shadow-lg shadow-blue-500/20 text-white">
                                <p className="text-[10px] font-black uppercase text-white/60 tracking-widest mb-1">Closing Balance</p>
                                <p className="text-2xl font-black font-mono tracking-tighter">
                                    {formatCurrency(ledgerData.closing_balance)}
                                </p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Date / التاريج</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Ref / المرجع</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Description / الوصف</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Debit / مدين</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Credit / دائن</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Running Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {/* Opening Row */}
                                        <tr className="bg-slate-50/30">
                                            <td className="px-6 py-4 text-xs font-bold text-slate-400" colSpan={5}>
                                                {locale === 'ar' ? 'الرصيد الافتتاحي للبترة' : 'Opening balance for the period'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-slate-600 font-mono">
                                                {formatCurrency(ledgerData.opening_balance)}
                                            </td>
                                        </tr>

                                        {loading ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                                                    Updating Ledger Data...
                                                </td>
                                            </tr>
                                        ) : ledgerData.items.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold italic">
                                                    No transactions found for this period.
                                                </td>
                                            </tr>
                                        ) : (
                                            ledgerData.items.map((item, idx) => (
                                                <tr key={item.id + idx} className="hover:bg-slate-50 group transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                            <span className="text-xs font-bold text-slate-700">{item.date.split('T')[0]}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-black text-slate-400 group-hover:text-blue-600 transition-colors uppercase tracking-tighter">
                                                            JE-{item.number}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-bold text-slate-800">{item.description}</p>
                                                        {item.memo && <p className="text-[10px] text-slate-400 italic mt-0.5">{item.memo}</p>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`text-sm font-black tabular-nums ${Number(item.debit) > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                            {Number(item.debit) > 0 ? formatCurrency(item.debit) : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`text-sm font-black tabular-nums ${Number(item.credit) > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                                            {Number(item.credit) > 0 ? formatCurrency(item.credit) : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-sm font-black text-slate-900 tabular-nums font-mono">
                                                            {formatCurrency(item.balance)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}

                                        {/* Final Row */}
                                        <tr className="bg-slate-50 border-t border-slate-200">
                                            <td className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest" colSpan={5}>
                                                {locale === 'ar' ? 'الرصيد الختامي' : 'Closing Balance Result'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-blue-700 font-mono text-lg">
                                                {formatCurrency(ledgerData.closing_balance)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
