"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Filter, ChevronRight, ChevronDown } from "lucide-react";
import { Account, AccountType } from "@/app/accounting/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchWithAuth } from "@/lib/api";
import AccountForm from "@/components/AccountForm";

interface AccountNode extends Account {
    children?: AccountNode[];
}

export default function ChartOfAccountsPage() {
    const { locale } = useLanguage();
    const [accounts, setAccounts] = useState<AccountNode[]>([]);
    const [filteredAccounts, setFilteredAccounts] = useState<AccountNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    const [activeFilter, setActiveFilter] = useState<string>("ALL");
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/accounts?tree=true");

            if (res.ok) {
                const data = await res.json();
                const list = data.accounts || (Array.isArray(data) ? data : []);
                setAccounts(list);
                setFilteredAccounts(list);
            } else {
                const errorText = await res.text();
                console.error("Failed to fetch accounts:", res.status, errorText);
            }
        } catch (err) {
            console.error("Fetch exception:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    useEffect(() => {
        let filtered = accounts;

        // Apply type filter
        if (typeFilter !== "ALL") {
            filtered = filterByType(filtered, typeFilter);
        }

        // Apply active filter
        if (activeFilter !== "ALL") {
            const isActive = activeFilter === "ACTIVE";
            filtered = filterByActive(filtered, isActive);
        }

        // Apply search
        if (searchQuery) {
            filtered = searchAccounts(filtered, searchQuery.toLowerCase());
        }

        setFilteredAccounts(filtered);
    }, [accounts, typeFilter, activeFilter, searchQuery]);

    const filterByType = (accs: AccountNode[], type: string): AccountNode[] => {
        return accs.filter(acc => {
            const matchesType = acc.type === type;
            const filteredChildren = acc.children ? filterByType(acc.children, type) : [];
            return matchesType || filteredChildren.length > 0;
        }).map(acc => ({
            ...acc,
            children: acc.children ? filterByType(acc.children, type) : []
        }));
    };

    const filterByActive = (accs: AccountNode[], isActive: boolean): AccountNode[] => {
        return accs.filter(acc => {
            const matchesActive = acc.active === isActive;
            const filteredChildren = acc.children ? filterByActive(acc.children, isActive) : [];
            return matchesActive || filteredChildren.length > 0;
        }).map(acc => ({
            ...acc,
            children: acc.children ? filterByActive(acc.children, isActive) : []
        }));
    };

    const searchAccounts = (accs: AccountNode[], query: string): AccountNode[] => {
        return accs.filter(acc => {
            const matchesSearch =
                acc.code.toLowerCase().includes(query) ||
                acc.name_ar.toLowerCase().includes(query) ||
                acc.name_en.toLowerCase().includes(query);
            const filteredChildren = acc.children ? searchAccounts(acc.children, query) : [];
            return matchesSearch || filteredChildren.length > 0;
        }).map(acc => ({
            ...acc,
            children: acc.children ? searchAccounts(acc.children, query) : []
        }));
    };

    const toggleNode = (id: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedNodes(newExpanded);
    };

    const renderAccount = (account: AccountNode, level: number = 0) => {
        const hasChildren = account.children && account.children.length > 0;
        const isExpanded = expandedNodes.has(account.id);
        const name = locale === 'ar' ? account.name_ar : account.name_en;

        return (
            <div key={account.id}>
                <div
                    className={`flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors border-b border-slate-100 ${account.is_group ? "bg-slate-50/50 font-bold" : ""
                        }`}
                    style={{ paddingLeft: `${level * 2 + 1}rem` }}
                >
                    {hasChildren && (
                        <button
                            onClick={() => toggleNode(account.id)}
                            className="p-1 hover:bg-slate-200 rounded transition-colors"
                        >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                    )}
                    {!hasChildren && <div className="w-6" />}

                    <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-2">
                            <span className="font-mono text-sm text-slate-600">{account.code}</span>
                        </div>
                        <div className="col-span-4">
                            <span className="text-slate-800">{name}</span>
                        </div>
                        <div className="col-span-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${account.type === 'ASSET' ? 'bg-emerald-100 text-emerald-700' :
                                account.type === 'LIABILITY' ? 'bg-rose-100 text-rose-700' :
                                    account.type === 'EQUITY' ? 'bg-blue-100 text-blue-700' :
                                        account.type === 'REVENUE' ? 'bg-purple-100 text-purple-700' :
                                            'bg-amber-100 text-amber-700'
                                }`}>
                                {account.type}
                            </span>
                        </div>
                        <div className="col-span-2 text-right">
                            <span className="font-mono text-sm">
                                {Number(account.balance || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="col-span-2 text-center">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${account.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                {account.active ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'غير نشط' : 'Inactive')}
                            </span>
                            {account.subledger_type && account.subledger_type !== 'NONE' && (
                                <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                                    {account.subledger_type}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div>
                        {account.children!.map(child => renderAccount(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">
                            {locale === 'ar' ? "دليل الحسابات" : "Chart of Accounts"}
                        </h1>
                        <p className="text-slate-500 text-sm font-medium mt-1">
                            {locale === 'ar' ? "إدارة شجرة الحسابات المالية" : "Manage Financial Account Hierarchy"}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                console.log("Manual refresh triggered");
                                fetchAccounts();
                            }}
                            className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-all font-bold shadow-sm"
                        >
                            <span>🔄</span> Refresh ({accounts.length})
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg transition-all font-bold"
                        >
                            <Plus size={20} />
                            {locale === 'ar' ? "إضافة حساب" : "Add Account"}
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 font-bold mb-4">
                        <Filter size={20} />
                        {locale === 'ar' ? "البحث والتصفية" : "Search & Filters"}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={locale === 'ar' ? "ابحث برقم الحساب أو الاسم..." : "Search by code or name..."}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Type Filter */}
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                        >
                            <option value="ALL">{locale === 'ar' ? "جميع الأنواع" : "All Types"}</option>
                            <option value="ASSET">{locale === 'ar' ? "أصول" : "Assets"}</option>
                            <option value="LIABILITY">{locale === 'ar' ? "خصوم" : "Liabilities"}</option>
                            <option value="EQUITY">{locale === 'ar' ? "حقوق ملكية" : "Equity"}</option>
                            <option value="REVENUE">{locale === 'ar' ? "إيرادات" : "Revenue"}</option>
                            <option value="EXPENSE">{locale === 'ar' ? "مصروفات" : "Expenses"}</option>
                        </select>

                        {/* Active Filter */}
                        <select
                            value={activeFilter}
                            onChange={(e) => setActiveFilter(e.target.value)}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                        >
                            <option value="ALL">{locale === 'ar' ? "الكل" : "All Accounts"}</option>
                            <option value="ACTIVE">{locale === 'ar' ? "النشطة فقط" : "Active Only"}</option>
                            <option value="INACTIVE">{locale === 'ar' ? "غير النشطة فقط" : "Inactive Only"}</option>
                        </select>
                    </div>
                </div>

                {/* Accounts Table */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-12 gap-4 font-bold text-sm text-slate-600">
                        <div className="col-span-2 pl-10">{locale === 'ar' ? "الرمز" : "Code"}</div>
                        <div className="col-span-4">{locale === 'ar' ? "اسم الحساب" : "Account Name"}</div>
                        <div className="col-span-2">{locale === 'ar' ? "النوع" : "Type"}</div>
                        <div className="col-span-2 text-right">{locale === 'ar' ? "الرصيد" : "Balance"}</div>
                        <div className="col-span-2 text-center">{locale === 'ar' ? "الحالة" : "Status"}</div>
                    </div>

                    <div className="max-h-[600px] overflow-auto">
                        {loading ? (
                            <div className="p-20 text-center text-slate-400 font-bold">
                                {locale === 'ar' ? "جاري التحميل..." : "Loading..."}
                            </div>
                        ) : filteredAccounts.length === 0 ? (
                            <div className="p-20 text-center text-slate-400 font-bold">
                                {locale === 'ar' ? "لا توجد حسابات" : "No accounts found"}
                            </div>
                        ) : (
                            filteredAccounts.map(account => renderAccount(account))
                        )}
                    </div>
                </div>
            </div>

            {showAddModal && (
                <AccountForm
                    onClose={() => setShowAddModal(false)}
                    onSuccess={fetchAccounts}
                />
            )}
        </div>
    );
}
