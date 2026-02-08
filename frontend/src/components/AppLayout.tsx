"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
    LayoutDashboard,
    Box,
    CircleDollarSign,
    FileBarChart,
    LogOut,
    Settings,
    ShieldCheck,
    Building2,
    Activity,
    FileText,
    Truck,
    Globe,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string>("viewer");
    const { t, locale, toggleLanguage } = useLanguage();

    useEffect(() => {
        return onAuthStateChanged(auth, async (u) => {
            if (!u && pathname !== "/login") {
                router.push("/login");
            }
            setUser(u);

            if (u) {
                // Fetch the role from the backend
                const token = await u.getIdToken();
                const res = await fetch("/api/users/me", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const profile = await res.json();
                    setRole(profile.role || "viewer");
                }
            }
        });
    }, [router, pathname]);

    if (pathname === "/login") return <>{children}</>;

    const allItems = [
        { label: t("dashboard"), href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "accountant", "storekeeper", "viewer"] },
        { label: t("inventory"), href: "/inventory", icon: Box, roles: ["admin", "accountant", "storekeeper"] },
        { label: "Sales / المبيعات", href: "/sales", icon: FileText, roles: ["admin", "accountant"] },
        { label: "Purchasing / المشتريات", href: "/purchasing", icon: Truck, roles: ["admin", "accountant", "storekeeper"] },
        { label: t("accounting"), href: "/accounting", icon: CircleDollarSign, roles: ["admin", "accountant"] },
        { label: "Assets / الأصول", href: "/assets", icon: Building2, roles: ["admin", "accountant"] },
        { label: t("reports"), href: "/reports", icon: FileBarChart, roles: ["admin", "accountant"] },
        { label: t("activity"), href: "/activity", icon: Activity, roles: ["admin", "accountant", "storekeeper"] },
        { label: t("employees"), href: "/users", icon: Settings, roles: ["admin"] },
    ];

    const menuItems = allItems.filter(item => item.roles.includes(role));

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full shadow-2xl z-20">
                <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                    <span className="text-lg font-bold tracking-tight text-emerald-400">OpenGate ERP</span>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-4">
                    <p className="text-[10px] uppercase font-bold text-slate-500 px-4 mb-2 tracking-widest">{t("mainMenu")}</p>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-link ${pathname === item.href ? "active" : ""}`}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 bg-slate-900/50">
                    <button
                        onClick={() => signOut(auth)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-medium"
                    >
                        <LogOut size={20} />
                        <span>{t("logout")}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 bg-[#f8fafc] transition-all duration-300 ${locale === 'ar' ? 'mr-64' : 'ml-64'}`}>
                {/* Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-slate-800">
                            {allItems.find((m) => m.href === pathname)?.label || t("system")}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Market Rate</span>
                            <span className="text-xs font-black text-emerald-600 font-mono">1 USD = 1,480 IQD</span>
                        </div>

                        {/* Language Switcher */}
                        <button
                            onClick={toggleLanguage}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors uppercase tracking-wider"
                        >
                            {locale === 'en' ? 'Arabic' : 'English'}
                        </button>

                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
                            <ShieldCheck size={14} />
                            <span className="uppercase">{role} {t("access")}</span>
                        </div>
                        <div className="flex items-center gap-3 group cursor-pointer">
                            <div className="text-left hidden md:block">
                                <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors uppercase">{role}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{user?.email}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 translate-y-0 active:translate-y-0.5 transition-transform">
                                {user?.email?.[0].toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
