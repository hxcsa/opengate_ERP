"use client";

import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Search, Calendar, FileText, Download, User as UserIcon, RefreshCw, Printer, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchWithAuth } from "@/lib/api";

export default function CustomerStatementPage() {
    const { t, locale } = useLanguage();
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<string>("");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [authReady, setAuthReady] = useState(false);
    const [authUser, setAuthUser] = useState<User | null>(null);

    // Wait for Auth
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    // Fetch Customers on Mount
    const fetchCustomers = useCallback(async () => {
        if (!authReady || !authUser) return;
        setLoadingCustomers(true);
        try {
            const res = await fetchWithAuth("/api/customers?page=1&page_size=100");
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.customers || (Array.isArray(data) ? data : []));
            }
        } catch (e) {
            console.error("Failed to fetch customers", e);
        } finally {
            setLoadingCustomers(false);
        }
    }, [authReady, authUser]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const generateReport = async () => {
        if (!selectedCustomer) return;
        setLoading(true);
        try {
            const res = await fetchWithAuth(`/api/reports/customer-statement?customer_id=${selectedCustomer}&from_date=${startDate}&to_date=${endDate}`);

            if (res.ok) {
                const data = await res.json();
                setReport(data);
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to generate report");
        } finally {
            setLoading(false);
        }
    };

    if (!authReady) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-600 shadow-xl shadow-indigo-200 rounded-3xl text-white transform -rotate-3">
                        <FileText size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            Customer Statements
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                            <p className="text-slate-500 text-xs font-black uppercase tracking-widest leading-none">Accounts Receivable</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                <div className="md:col-span-4 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Customer</label>
                    <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            className="w-full bg-slate-50 border-none pl-12 pr-4 py-4 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                            value={selectedCustomer}
                            onChange={(e) => setSelectedCustomer(e.target.value)}
                            disabled={loadingCustomers}
                        >
                            <option value="">{loadingCustomers ? "Loading Customers..." : "Select a Customer..."}</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="md:col-span-3 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="date"
                            className="w-full bg-slate-50 border-none pl-12 pr-4 py-4 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="md:col-span-3 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="date"
                            className="w-full bg-slate-50 border-none pl-12 pr-4 py-4 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="md:col-span-2">
                    <button
                        onClick={generateReport}
                        disabled={loading || !selectedCustomer}
                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={20} /> : "Generate"}
                    </button>
                </div>
            </div>

            {/* Report View */}
            {report && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {/* Report Header */}
                    <div className="p-8 border-b border-slate-200 bg-white">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">{report.customer_name}</h2>
                                <p className="text-sm font-medium text-slate-500">Statement of Account</p>
                                <p className="text-sm text-slate-400 mt-1">
                                    Period: <span className="font-mono text-slate-600">{new Date(startDate).toLocaleDateString()}</span> — <span className="font-mono text-slate-600">{new Date(endDate).toLocaleDateString()}</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <button className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
                                    <Printer size={16} /> Print Statement
                                </button>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Currency</p>
                                    <span className="font-mono font-bold text-slate-700">{report.currency}</span>
                                </div>
                            </div>
                        </div>

                        {/* Summary Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                            <div className="p-5 bg-white">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Opening Balance</p>
                                <p className="text-lg font-bold text-slate-700 font-mono">{Number(report.opening_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="p-5 bg-white">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Debits</p>
                                <p className="text-lg font-bold text-slate-700 font-mono">{Number(report.period_totals.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="p-5 bg-white">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Credits</p>
                                <p className="text-lg font-bold text-slate-700 font-mono">{Number(report.period_totals.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="p-5 bg-slate-50">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Closing Balance</p>
                                <p className="text-xl font-bold text-slate-900 font-mono">{Number(report.closing_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </div>

                    {/* Report Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold uppercase text-slate-500 tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-xs font-semibold uppercase text-slate-500 tracking-wider">Ref</th>
                                    <th className="px-6 py-3 text-xs font-semibold uppercase text-slate-500 tracking-wider w-1/3">Description</th>
                                    <th className="px-6 py-3 text-xs font-semibold uppercase text-slate-500 tracking-wider text-right">Debit</th>
                                    <th className="px-6 py-3 text-xs font-semibold uppercase text-slate-500 tracking-wider text-right">Credit</th>
                                    <th className="px-6 py-3 text-xs font-semibold uppercase text-slate-500 tracking-wider text-right">Net</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {report.period_lines.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                            No transactions found in this period.
                                        </td>
                                    </tr>
                                ) : (
                                    report.period_lines.map((line: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-3 text-sm text-slate-600 font-mono">
                                                {new Date(line.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-3 text-sm text-indigo-600 font-medium">
                                                {line.number}
                                            </td>
                                            <td className="px-6 py-3">
                                                <p className="text-sm font-medium text-slate-700">{line.description}</p>
                                                {line.memo && <p className="text-xs text-slate-400 mt-0.5">{line.memo}</p>}
                                            </td>
                                            <td className="px-6 py-3 text-right font-mono text-sm text-slate-600">
                                                {Number(line.debit) > 0 ? Number(line.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                            </td>
                                            <td className="px-6 py-3 text-right font-mono text-sm text-slate-600">
                                                {Number(line.credit) > 0 ? Number(line.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                            </td>
                                            <td className={`px-6 py-3 text-right font-mono text-sm font-semibold ${Number(line.balance_impact) >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                                                {Number(line.balance_impact) > 0 ? '+' : ''}{Number(line.balance_impact).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
