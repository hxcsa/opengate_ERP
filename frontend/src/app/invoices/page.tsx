"use client";

import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import InvoiceFilterBar from "@/components/InvoiceFilterBar";
import InvoiceTable from "@/components/InvoiceTable";
import InvoiceForm from "@/components/InvoiceForm";
import { Plus, FileText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [role, setRole] = useState("viewer");
    const [authUser, setAuthUser] = useState<User | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, page_size: 20, total_count: -1 });
    const { t } = useLanguage();
    const router = useRouter();

    // Wait for Firebase Auth to initialize before doing anything
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            setAuthUser(user);
            setAuthReady(true);
            if (user) {
                try {
                    const tokenResult = await user.getIdTokenResult();
                    if (tokenResult.claims.role) {
                        setRole(tokenResult.claims.role as string);
                    }
                } catch (e) {
                    console.error("Failed to get role:", e);
                }
            }
        });
        return () => unsub();
    }, []);



    const fetchData = useCallback(async () => {
        if (!authReady || !authUser) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            params.set("page", String(pagination.page));
            params.set("page_size", String(pagination.page_size));

            const res = await fetchWithAuth(`/api/sales/invoices?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setInvoices(Array.isArray(data) ? data : data.invoices || []);
                if (data.total_count !== undefined) {
                    setPagination(prev => ({ ...prev, total_count: data.total_count }));
                }
            } else if (res.status === 401) {
                setError("Session expired. Please refresh the page.");
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.detail || "Failed to fetch invoices");
            }
        } catch (error: any) {
            console.error("Error fetching invoices:", error);
            setError(error.message || "Network error");
        } finally {
            setLoading(false);
        }
    }, [filters, refreshTrigger, pagination.page, authReady, authUser]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (data: any) => {
        try {
            const res = await fetchWithAuth("/api/sales/invoices", {
                method: "POST",
                body: JSON.stringify(data)
            });
            if (res.ok) {
                setIsFormOpen(false);
                setRefreshTrigger(prev => prev + 1);
            } else {
                const err = await res.json();
                alert(`Failed to save invoice: ${err.detail || "Unknown error"}`);
            }
        } catch (error) {
            alert("Error connecting to server");
        }
    };

    const handleAction = async (action: string, invoice: any) => {
        if (action === 'view') {
            alert(`View Invoice ${invoice.invoice_number} (Coming Soon)`);
        } else if (action === 'print') {
            window.open(`/api/sales/invoices/${invoice.id}/pdf`, '_blank');
        } else if (action === 'pay') {
            const amountStr = prompt(
                `Enter payment amount for ${invoice.invoice_number}\nRemaining: ${Number(invoice.remaining_amount || invoice.total).toLocaleString()} IQD`,
                String(invoice.remaining_amount || invoice.total)
            );
            if (amountStr) {
                const amount = parseFloat(amountStr);
                if (isNaN(amount) || amount <= 0) return alert("Invalid amount");
                try {
                    const res = await fetchWithAuth(
                        `/api/sales/invoices/${invoice.id}/pay?amount=${amount}&payment_method=CASH`,
                        { method: "POST" }
                    );
                    if (res.ok) {
                        setRefreshTrigger(prev => prev + 1);
                    } else {
                        const err = await res.json().catch(() => ({}));
                        alert(err.detail || "Payment failed");
                    }
                } catch (e) {
                    alert("Error processing payment");
                }
            }
        } else if (action === 'void') {
            if (confirm(`Are you sure you want to VOID invoice ${invoice.invoice_number}?\nThis action is permanent and will be logged in the audit trail.`)) {
                const reason = prompt("Enter void reason:") || "User cancelled";
                try {
                    const res = await fetchWithAuth(
                        `/api/sales/invoices/${invoice.id}/void?reason=${encodeURIComponent(reason)}`,
                        { method: "POST" }
                    );
                    if (res.ok) {
                        setRefreshTrigger(prev => prev + 1);
                    } else {
                        const err = await res.json().catch(() => ({}));
                        alert(err.detail || "Void failed");
                    }
                } catch (e) {
                    alert("Error voiding invoice");
                }
            }
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Invoices / الفواتير</h1>
                    <p className="text-slate-500 text-sm font-medium">Manage customer invoices, track payments, and audit document lifecycle</p>
                </div>

                {(role === "admin" || role === "accountant") && (
                    <button
                        onClick={() => router.push("/sales/invoices/new")}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 font-black text-sm uppercase tracking-wider active:scale-95"
                    >
                        <Plus size={20} /> Create New Invoice
                    </button>
                )}
            </div>

            <InvoiceFilterBar onFilterChange={(f) => { setFilters(f); setPagination(prev => ({ ...prev, page: 1 })); }} />

            {error ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 text-center">
                    <p className="text-rose-600 font-bold mb-3">{error}</p>
                    <button
                        onClick={() => { setError(null); setRefreshTrigger(prev => prev + 1); }}
                        className="px-6 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition-all"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <InvoiceTable
                    invoices={invoices}
                    loading={loading}
                    onAction={handleAction}
                    role={role}
                />
            )}

            {/* Modal-based InvoiceForm is deprecated in favor of /sales/invoices/new */}
        </div>
    );
}
