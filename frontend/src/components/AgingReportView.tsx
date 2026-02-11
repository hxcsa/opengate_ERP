import { useState, useEffect } from "react";
import { AgingItem } from "@/app/accounting/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchWithAuth } from "@/lib/api";

interface Props {
    type: "AR" | "AP";
    companyId: string;
}

export default function AgingReportView({ type, companyId }: Props) {
    const { locale } = useLanguage();
    const [data, setData] = useState<AgingItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetchWithAuth(`/api/reports/aging/${type}`, {
                    headers: {
                        'company-id': companyId
                    }
                });

                if (res.ok) {
                    const jsonData = await res.json();
                    if (Array.isArray(jsonData)) {
                        setData(jsonData);
                    } else {
                        console.error("Aging data is not an array:", jsonData);
                        setData([]);
                    }
                } else {
                    console.error("Failed to fetch aging report:", res.status, res.statusText);
                    setData([]);
                }
            } catch (error) {
                console.error("Aging fetch error:", error);
                setData([]);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [type, companyId]);

    if (loading) return <div className="p-8 text-center">Loading Aging Report...</div>;

    const formatCurrency = (val: string) => {
        return Number(val).toLocaleString(undefined, { minimumFractionDigits: 0 });
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 border-b">
                        <th className="p-3 text-left">{locale === 'ar' ? "الطرف" : "Partner"}</th>
                        <th className="p-3 text-right">{locale === 'ar' ? "المجموع" : "Total"}</th>
                        <th className="p-3 text-right">{locale === 'ar' ? "حالي" : "Current"}</th>
                        <th className="p-3 text-right">1-30</th>
                        <th className="p-3 text-right">31-60</th>
                        <th className="p-3 text-right">61-90</th>
                        <th className="p-3 text-right">90+</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item) => (
                        <tr key={item.partner_id} className="border-b hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-medium">{item.partner_name}</td>
                            <td className="p-3 text-right font-bold text-indigo-700">{formatCurrency(item.total)}</td>
                            <td className="p-3 text-right">{formatCurrency(item.current)}</td>
                            <td className="p-3 text-right">{formatCurrency(item.d30)}</td>
                            <td className="p-3 text-right">{formatCurrency(item.d60)}</td>
                            <td className="p-3 text-right">{formatCurrency(item.d90)}</td>
                            <td className="p-3 text-right text-rose-600">{formatCurrency(item.over90)}</td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500">
                                {locale === 'ar' ? "لا يوجد بيانات مطابقة" : "No outstanding items found"}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
