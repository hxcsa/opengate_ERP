import { useState, useEffect } from "react";
import { ReconciliationData } from "@/app/accounting/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle, AlertCircle } from "lucide-react";
import { auth } from "@/lib/firebase";

interface Props {
    type: "AR" | "AP";
    companyId: string;
}

export default function ReconciliationView({ type, companyId }: Props) {
    const { locale } = useLanguage();
    const [data, setData] = useState<ReconciliationData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const token = await auth.currentUser?.getIdToken();
                if (!token) {
                    setLoading(false);
                    return;
                }

                const endpoint = type === "AR" ? "ar" : "ap";
                const res = await fetch(`/api/reports/reconcile/${endpoint}`, {
                    headers: {
                        'company-id': companyId,
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (res.ok) {
                    const jsonData = await res.json();
                    setData(jsonData);
                } else {
                    console.error("Reconcile fetch failed:", res.status);
                }
            } catch (error) {
                console.error("Reconcile fetch error:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [type, companyId]);

    if (loading) return <div className="p-4 text-center">Checking Reconciliation...</div>;
    if (!data) return null;

    const formatCurrency = (val: string) => {
        return Number(val).toLocaleString(undefined, { minimumFractionDigits: 0 });
    };

    return (
        <div className={`p-4 rounded-xl border-l-4 ${data.is_reconciled ? "bg-emerald-50 border-emerald-500" : "bg-rose-50 border-rose-500"}`}>
            <div className="flex items-center gap-3 mb-4">
                {data.is_reconciled ? (
                    <CheckCircle className="text-emerald-600" size={24} />
                ) : (
                    <AlertCircle className="text-rose-600" size={24} />
                )}
                <div>
                    <h3 className="font-bold text-slate-900">
                        {type === 'AR'
                            ? (locale === 'ar' ? "مطابقة المدينين - الحساب الرقابي" : "AR Subledger Reconciliation")
                            : (locale === 'ar' ? "مطابقة الدائنين - الحساب الرقابي" : "AP Subledger Reconciliation")
                        }
                    </h3>
                    <p className="text-sm text-slate-600">
                        {data.is_reconciled
                            ? (locale === 'ar' ? "إجمالي الأستاذ المساعد مطابق للحساب الرقابي" : "Subledger matches control account perfectly.")
                            : (locale === 'ar' ? "يوجد فرق بين الأستاذ المساعد والحساب الرقابي" : "Discrepancy detected between subledger and control account.")
                        }
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-2">
                <div>
                    <span className="text-xs uppercase text-slate-500 font-bold block mb-1">
                        {locale === 'ar' ? "إجمالي الأستاذ المساعد" : "Subledger Total"}
                    </span>
                    <span className="text-xl font-mono">{formatCurrency(data.subledger_total)}</span>
                </div>
                <div>
                    <span className="text-xs uppercase text-slate-500 font-bold block mb-1">
                        {locale === 'ar' ? "رصيد الحساب الرقابي" : "Control Account"}
                    </span>
                    <span className="text-xl font-mono">{formatCurrency(data.control_account_balance)}</span>
                </div>
                <div>
                    <span className="text-xs uppercase text-slate-500 font-bold block mb-1">
                        {locale === 'ar' ? "الفرق" : "Difference"}
                    </span>
                    <span className={`text-xl font-mono font-bold ${data.is_reconciled ? "text-emerald-700" : "text-rose-700"}`}>
                        {formatCurrency(data.difference)}
                    </span>
                </div>
            </div>
        </div>
    );
}
