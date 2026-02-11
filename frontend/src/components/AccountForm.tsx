"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Account, AccountType } from "@/app/accounting/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchWithAuth } from "@/lib/api";

interface Props {
    onClose: () => void;
    onSuccess: () => void;
    editAccount?: Account | null;
}

export default function AccountForm({ onClose, onSuccess, editAccount }: Props) {
    const { locale } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);

    const [formData, setFormData] = useState({
        code: editAccount?.code || "",
        name_ar: editAccount?.name_ar || "",
        name_en: editAccount?.name_en || "",
        type: editAccount?.type || AccountType.ASSET,
        parent_id: editAccount?.parent_id || "",
        is_group: editAccount?.is_group || false,
        active: editAccount?.active ?? true,
        subledger_type: editAccount?.subledger_type || "NONE",
        currency: editAccount?.currency || "IQD",
        company_id: "opengate_hq_001"
    });

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const res = await fetchWithAuth("/api/accounts");
                if (res.ok) {
                    const data = await res.json();
                    const list = data.accounts || (Array.isArray(data) ? data : []);
                    setAccounts(list);
                }
            } catch (err) {
                console.error("Failed to fetch accounts:", err);
            }
        };

        fetchAccounts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            console.log("Submitting account:", formData);
            const res = await fetchWithAuth("/api/accounts", {
                method: "POST",
                body: JSON.stringify(formData)
            });

            console.log("Response status:", res.status);
            if (res.ok) {
                const result = await res.json();
                console.log("Account created successfully:", result);
                onSuccess();
                onClose();
            } else {
                const error = await res.json();
                console.error("Failed to create account:", error);
                alert(error.detail || "Failed to create account");
            }
        } catch (err) {
            console.error("Submit error:", err);
            alert("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div>
                        <h2 className="text-2xl font-black">
                            {locale === 'ar' ? "إضافة حساب جديد" : "Add New Account"}
                        </h2>
                        <p className="text-sm opacity-90 mt-1">
                            {locale === 'ar' ? "دليل الحسابات" : "Chart of Accounts"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Account Code */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                {locale === 'ar' ? "رقم الحساب" : "Account Code"} <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={locale === 'ar' ? "مثال: 1010" : "e.g., 1010"}
                            />
                        </div>

                        {/* Account Type */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                {locale === 'ar' ? "نوع الحساب" : "Account Type"} <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="ASSET">{locale === 'ar' ? "أصول" : "Asset"}</option>
                                <option value="LIABILITY">{locale === 'ar' ? "خصوم" : "Liability"}</option>
                                <option value="EQUITY">{locale === 'ar' ? "حقوق ملكية" : "Equity"}</option>
                                <option value="REVENUE">{locale === 'ar' ? "إيرادات" : "Revenue"}</option>
                                <option value="EXPENSE">{locale === 'ar' ? "مصروفات" : "Expense"}</option>
                            </select>
                        </div>

                        {/* Arabic Name */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                {locale === 'ar' ? "اسم الحساب بالعربي" : "Account Name (Arabic)"} <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                dir="rtl"
                                value={formData.name_ar}
                                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="مثال: النقدية"
                            />
                        </div>

                        {/* English Name */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                {locale === 'ar' ? "اسم الحساب بالإنجليزي" : "Account Name (English)"} <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name_en}
                                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Cash"
                            />
                        </div>

                        {/* Parent Account */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                {locale === 'ar' ? "الحساب الرئيسي" : "Parent Account"}
                            </label>
                            <select
                                value={formData.parent_id}
                                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">{locale === 'ar' ? "لا يوجد (حساب رئيسي)" : "None (Top Level)"}</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.code} - {locale === 'ar' ? acc.name_ar : acc.name_en}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Subledger Type */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                {locale === 'ar' ? "نوع دفتر الأستاذ المساعد" : "Subledger Type"}
                            </label>
                            <select
                                value={formData.subledger_type}
                                onChange={(e) => setFormData({ ...formData, subledger_type: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="NONE">{locale === 'ar' ? "لا يوجد" : "None"}</option>
                                <option value="CUSTOMER">{locale === 'ar' ? "عميل" : "Customer"}</option>
                                <option value="SUPPLIER">{locale === 'ar' ? "مورد" : "Supplier"}</option>
                                <option value="EMPLOYEE">{locale === 'ar' ? "موظف" : "Employee"}</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-1">
                                {locale === 'ar'
                                    ? "مثال: اختر 'موظف' لحساب رواتب الموظفين لإظهار تفاصيل كل موظف"
                                    : "e.g., Select 'Employee' for employee salaries to show details per employee"}
                            </p>
                        </div>

                        {/* Active Status */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="active"
                                checked={formData.active}
                                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <label htmlFor="active" className="text-sm font-bold text-slate-700">
                                {locale === 'ar' ? "حساب نشط" : "Active Account"}
                            </label>
                        </div>

                        {/* Is Group */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="is_group"
                                checked={formData.is_group}
                                onChange={(e) => setFormData({ ...formData, is_group: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <label htmlFor="is_group" className="text-sm font-bold text-slate-700">
                                {locale === 'ar' ? "حساب مجموعة (يحتوي على حسابات فرعية)" : "Group Account (Has Sub-accounts)"}
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            {locale === 'ar' ? "إلغاء" : "Cancel"}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
                        >
                            {loading
                                ? (locale === 'ar' ? "جاري الحفظ..." : "Saving...")
                                : (locale === 'ar' ? "حفظ الحساب" : "Save Account")
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
