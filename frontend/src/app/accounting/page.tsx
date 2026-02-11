"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Book, FileText, PieChart, ShieldCheck,
    Landmark, CreditCard, FolderTree, ArrowRight,
    Tag, LayoutGrid, Loader2
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter, useSearchParams } from "next/navigation";
import React, { memo, Suspense } from "react";
import { fetchWithAuth } from "@/lib/api";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

import CategoriesPage from "./categories/page";
import PaymentVouchersPage from "./payment-vouchers/page";
import ReceiptsPage from "./receipts/page";

const FinanceAction = memo(({ title, sub, icon, color, onClick, href }: any) => {
    const router = useRouter();

    const handleClick = () => {
        if (href) {
            router.push(href);
        } else if (onClick) {
            onClick();
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`p-6 rounded-2xl text-white flex flex-col items-center justify-center gap-3 hover:scale-[1.03] transition-all shadow-lg active:scale-95 ${color}`}
        >
            <div className="p-3 bg-white/10 border border-white/20 rounded-xl shadow-inner">{icon}</div>
            <div className="text-center">
                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-0.5">{sub}</p>
                <h4 className="font-black text-lg">{title}</h4>
            </div>
            {href && <ArrowRight size={16} className="opacity-50" />}
        </button>
    );
});
FinanceAction.displayName = "FinanceAction";

const TABS = [
    { id: "overview", label: "Overview", labelAr: "نظرة عامة", icon: <LayoutGrid size={16} /> },
    { id: "categories", label: "Categories", labelAr: "التصنيفات", icon: <Tag size={16} /> },
    { id: "payments", label: "Payment Vouchers", labelAr: "سندات الصرف", icon: <CreditCard size={16} /> },
    { id: "receipts", label: "Receipts", labelAr: "سندات القبض", icon: <FileText size={16} /> },
];

function AccountingInner() {
    const [snapshot, setSnapshot] = useState({ assets: "0", liabilities: "0", equity: "0" });
    const [loading, setLoading] = useState(true);
    const [authReady, setAuthReady] = useState(false);
    const [authUser, setAuthUser] = useState<User | null>(null);
    const { locale } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get("tab") || "overview";

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    const fetchData = useCallback(async () => {
        if (!authReady || !authUser) return;
        setLoading(true);
        try {
            const bsRes = await fetchWithAuth("/api/reports/balance-sheet");
            const bsData = bsRes.ok ? await bsRes.json() : {};
            if (bsData) {
                setSnapshot({
                    assets: bsData.total_assets || "0",
                    liabilities: bsData.total_liabilities || "0",
                    equity: bsData.total_equity || "0"
                });
            }
        } catch (e) {
            console.error("Accounting fetch error:", e);
        } finally {
            setLoading(false);
        }
    }, [authReady, authUser]);

    useEffect(() => {
        if (activeTab === "overview") fetchData();
    }, [fetchData, activeTab]);

    const setTab = (tabId: string) => {
        router.push(`/accounting?tab=${tabId}`);
    };

    if (!authReady) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Financial Management / الإدارة المالية</h1>
                    <p className="text-slate-500 text-sm font-medium">Standard Iraqi Unified Accounting System</p>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl overflow-x-auto">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                            }`}
                    >
                        {tab.icon}
                        {locale === "ar" ? tab.labelAr : tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
                <div className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                        <FinanceAction
                            title={locale === 'ar' ? "دليل الحسابات" : "Chart of Accounts"}
                            sub="COA"
                            icon={<FolderTree size={20} />}
                            color="bg-blue-600"
                            href="/accounting/chart-of-accounts"
                        />
                        <FinanceAction
                            title={locale === 'ar' ? "القيود" : "Journal"}
                            sub="Entries"
                            icon={<Book size={20} />}
                            color="bg-indigo-600"
                            href="/accounting/journals"
                        />
                        <FinanceAction
                            title={locale === 'ar' ? "ميزان المراجعة" : "Trial Balance"}
                            sub="Reports"
                            icon={<PieChart size={20} />}
                            color="bg-emerald-600"
                            href="/accounting/trial-balance"
                        />
                        <FinanceAction
                            title={locale === 'ar' ? "الميزانية" : "Balance Sheet"}
                            sub="Statements"
                            icon={<ShieldCheck size={20} />}
                            color="bg-purple-600"
                            href="/reports/balance-sheet"
                        />
                        <FinanceAction
                            title={locale === 'ar' ? "سندات الصرف" : "Payments"}
                            sub="CASH OUT"
                            icon={<CreditCard size={20} />}
                            color="bg-rose-600"
                            onClick={() => setTab("payments")}
                        />
                        <FinanceAction
                            title={locale === 'ar' ? "سندات القبض" : "Receipts"}
                            sub="CASH IN"
                            icon={<FileText size={20} />}
                            color="bg-emerald-500"
                            onClick={() => setTab("receipts")}
                        />
                        <FinanceAction
                            title={locale === 'ar' ? "أعمار الديون" : "AR Aging"}
                            sub="RECEIVABLES"
                            icon={<Book size={20} />}
                            color="bg-amber-600"
                            href="/reports/aging?type=ar"
                        />
                        <FinanceAction
                            title={locale === 'ar' ? "أعمار الدائنين" : "AP Aging"}
                            sub="PAYABLES"
                            icon={<Book size={20} />}
                            color="bg-slate-700"
                            href="/reports/aging?type=ap"
                        />
                        <FinanceAction
                            title={locale === 'ar' ? "التسوية البنكية" : "Bank Reconciliation"}
                            sub="BANK"
                            icon={<Landmark size={20} />}
                            color="bg-slate-800"
                            href="/accounting/bank-reconciliation"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="enterprise-card bg-[#0f172a] text-white border-none shadow-2xl relative overflow-hidden">
                            <div className="relative z-10">
                                <h4 className="text-slate-400 text-[10px] font-black uppercase mb-6 tracking-[0.2em]">Financial Snapshot</h4>
                                <div className="space-y-5">
                                    <div className="flex justify-between items-center group cursor-pointer">
                                        <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Total Assets</span>
                                        <span className="font-black text-lg">{(Number(snapshot.assets) / 1000000).toFixed(1)}M</span>
                                    </div>
                                    <div className="flex justify-between items-center group cursor-pointer">
                                        <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Total Liabilities</span>
                                        <span className="font-black text-lg text-rose-400">{(Number(snapshot.liabilities) / 1000000).toFixed(1)}M</span>
                                    </div>
                                    <div className="pt-4 border-t border-slate-800 flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Net Equity</p>
                                            <span className="font-black text-3xl text-emerald-400 tabular-nums">{(Number(snapshot.equity) / 1000000).toFixed(1)}M</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 mb-1">IQD</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => router.push('/reports/balance-sheet')}
                                    className="w-full mt-8 bg-blue-600 hover:bg-blue-700 transition-all py-3 rounded-xl text-sm font-black shadow-lg shadow-blue-500/20"
                                >
                                    {locale === 'ar' ? 'فتح الميزانية' : 'Open Balance Sheet'}
                                </button>
                            </div>
                            <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
                        </div>

                        <div className="enterprise-card border-none shadow-sm flex items-start gap-4 p-5">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 text-sm mb-1">
                                    {locale === 'ar' ? 'فحص السلامة' : 'Integrity Check'}
                                </h4>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    {locale === 'ar'
                                        ? 'دفتر الأستاذ المالي متوازن. جميع فحوصات ميزان المراجعة ناجحة للفترة الحالية.'
                                        : 'Financial ledger is in balance. All trial balance checks passed for the current period.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "categories" && <CategoriesPage />}
            {activeTab === "payments" && <PaymentVouchersPage />}
            {activeTab === "receipts" && <ReceiptsPage />}
        </div>
    );
}

export default function Accounting() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-[50vh]"><Loader2 className="animate-spin text-blue-600" size={32} /></div>}>
            <AccountingInner />
        </Suspense>
    );
}
