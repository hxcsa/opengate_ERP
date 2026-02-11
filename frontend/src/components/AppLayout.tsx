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
    ChevronDown,
    Menu,
    X,
    CalendarClock,
    Users,
    UserCog,
    RefreshCw
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ALL_ITEMS = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "accountant", "storekeeper", "viewer"] },
    { label: "Schedule / الجدول", href: "/schedule", icon: CalendarClock, roles: ["admin", "accountant", "storekeeper", "viewer"] },
    { label: "Invoices / الفواتير", href: "/invoices", icon: FileText, roles: ["admin", "accountant"] },
    { label: "Customers / الزبائن", href: "/customers", icon: Users, roles: ["admin", "accountant"] },
    { label: "Inventory", href: "/inventory", icon: Box, roles: ["admin", "accountant", "storekeeper"] },
    { label: "Sales / المبيعات", href: "/sales", icon: FileBarChart, roles: ["admin", "accountant"] },

    { label: "Purchasing / المشتريات", href: "/purchasing", icon: Truck, roles: ["admin", "accountant", "storekeeper"] },
    {
        label: "Accounting",
        href: "/accounting",
        icon: CircleDollarSign,
        roles: ["admin", "accountant"],
        subItems: [
            { label: "Overview", href: "/accounting" },
            { label: "Categories / التصنيفات", href: "/accounting?tab=categories" },
            { label: "Payment Vouchers / سندات الصرف", href: "/accounting?tab=payments" },
            { label: "Receipts / سندات القبض", href: "/accounting?tab=receipts" },
            { label: "Chart of Accounts", href: "/accounting/chart-of-accounts" },
            { label: "Expenses", href: "/accounting/expenses" },
            { label: "Credit Notes", href: "/sales/credit-notes" },
            { label: "Journal Entries", href: "/accounting/journals" },
            { label: "General Ledger", href: "/accounting/general-ledger" },
            { label: "Statements", href: "/accounting/statements" },
            { label: "Trial Balance", href: "/accounting/trial-balance" },
        ]
    },
    { label: "Assets / الأصول", href: "/assets", icon: Building2, roles: ["admin", "accountant"] },
    { label: "Reports", href: "/reports", icon: Globe, roles: ["admin", "accountant"] },
    { label: "Activity", href: "/activity", icon: Activity, roles: ["admin", "accountant", "storekeeper"] },
    { label: "Employees / الموظفين", href: "/employees", icon: UserCog, roles: ["admin"] },
];

import { useRef } from "react";

// ... existing imports

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string>("viewer");
    const [allowedTabs, setAllowedTabs] = useState<string[] | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(45 * 60); // 45 minutes in seconds
    const { t, locale, toggleLanguage } = useLanguage();

    // Timer ref to access current value in event handlers without re-binding
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    // 🔐 Security: Visible 45-minute Manual Timer
    useEffect(() => {
        console.log("Timer Effect Mounted");

        // Update countdown every second
        const intervalId = setInterval(() => {
            setTimeLeft((prev) => {
                const newValue = prev - 1;
                // console.log("Tick:", newValue); 

                if (newValue <= 0) {
                    if (auth.currentUser) {
                        console.log("Session expired.");
                        signOut(auth);
                    }
                    clearInterval(intervalId);
                    return 0;
                }
                return newValue;
            });
        }, 1000);

        return () => {
            console.log("Timer Effect Unmounted");
            clearInterval(intervalId);
        }
    }, []);

    const extendSession = () => {
        console.log("Session Extended");
        setTimeLeft(45 * 60);
        // Optional: Add a visual feedback toast here if desired
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // ... existing auth effect ...
    useEffect(() => {
        return onAuthStateChanged(auth, async (u) => {
            if (!u && pathname !== "/login") {
                router.push("/login");
            }
            setUser(u);

            if (u) {
                // Fetch the role from the backend (Using cached claims if possible)
                try {
                    const token = await u.getIdTokenResult();
                    const claims: any = token.claims;
                    if (claims.role) {
                        setRole(claims.role);
                    }

                    // Always try to fetch profile to get granular permissions (allowedTabs)
                    const res = await fetch("/api/users/me", {
                        headers: { "Authorization": `Bearer ${token.token}` }
                    });
                    if (res.ok) {
                        const profile = await res.json();
                        if (profile.role) setRole(profile.role);
                        if (profile.allowed_tabs) setAllowedTabs(profile.allowed_tabs);
                    }
                } catch (e) {
                    console.error("Auth claim error:", e);
                }
            }
        });
    }, [router, pathname]);

    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

    // ... existing menu logic ...

    // Auto-expand menu if sub-item is active
    useEffect(() => {
        const activeItem = ALL_ITEMS.find(item =>
            item.subItems?.some(sub => sub.href === pathname)
        );
        if (activeItem && !expandedMenus.includes(activeItem.label)) {
            setExpandedMenus(prev => [...prev, activeItem.label]);
        }
    }, [pathname]);

    if (pathname === "/login") return <>{children}</>;


    const menuItems = ALL_ITEMS.filter(item => {
        // 1. Check role-based access
        const hasRoleAccess = item.roles.includes(role);

        // 2. Check granular permissions if set (Admins bypass granular checks)
        if (role !== "admin" && allowedTabs !== null && allowedTabs.length > 0) {
            // Find key from label or href to check against allowedTabs
            const key = item.href.replace("/", "");
            // dashboard tab is always allowed if they have the role
            if (key === "dashboard") return hasRoleAccess;

            // Allow if explicitly in allowedTabs (Overrides base role)
            return allowedTabs.includes(key);
        }

        return hasRoleAccess;
    });

    const toggleMenu = (label: string) => {
        setExpandedMenus(prev =>
            prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
        );
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar Overlay (Mobile Only) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 transition-opacity lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                w-64 bg-slate-900 text-white flex flex-col fixed h-full shadow-2xl z-40 transition-transform duration-300
                lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : (locale === 'ar' ? 'translate-x-64' : '-translate-x-64')}
            `}>
                <div className="p-6 flex items-center justify-between border-b border-slate-800">
                    <span className="text-lg font-bold tracking-tight text-emerald-400">OpenGate ERP</span>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
                    <p className="text-[10px] uppercase font-bold text-slate-500 px-4 mb-2 tracking-widest">{t("mainMenu")}</p>
                    {menuItems.map((item: any) => {
                        const Icon = item.icon;
                        const isExpanded = expandedMenus.includes(item.label);
                        const hasSubItems = item.subItems && item.subItems.length > 0;

                        return (
                            <div key={item.label} className="space-y-1">
                                {hasSubItems ? (
                                    <button
                                        onClick={() => toggleMenu(item.label)}
                                        className={`nav-link w-full flex items-center justify-between ${pathname.startsWith(item.href) ? "active" : ""}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon size={20} />
                                            <span>{item.label}</span>
                                        </div>
                                        <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                ) : (
                                    <Link
                                        href={item.href}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={`nav-link ${pathname === item.href ? "active" : ""}`}
                                    >
                                        <Icon size={20} />
                                        <span>{item.label}</span>
                                    </Link>
                                )}

                                {hasSubItems && isExpanded && (
                                    <div className="pl-11 space-y-1">
                                        {item.subItems.map((sub: any) => (
                                            <Link
                                                key={sub.href}
                                                href={sub.href}
                                                onClick={() => setIsSidebarOpen(false)}
                                                className={`block py-2 text-sm text-slate-400 hover:text-white transition-colors ${pathname === sub.href ? "text-emerald-400 font-bold" : ""}`}
                                            >
                                                {sub.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
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
            <main className={`
                flex-1 bg-[#f8fafc] transition-all duration-300 flex flex-col h-full overflow-hidden
                ${locale === 'ar' ? 'lg:mr-64' : 'lg:ml-64'}
            `}>
                {/* Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 hover:bg-slate-100 rounded-lg lg:hidden text-slate-600"
                        >
                            <Menu size={24} />
                        </button>
                        <h2 className="text-lg font-bold text-slate-800 truncate max-w-[150px] sm:max-w-none">
                            {ALL_ITEMS.find((m) => m.href === pathname)?.label || t("system")}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4 lg:gap-6">
                        {/* Session Timer - Click to Extend */}
                        <button
                            onClick={extendSession}
                            title="Click to extend session to 45 minutes"
                            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer hover:bg-slate-100 active:scale-95 ${timeLeft < 300 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-500'
                                }`}>
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Session</span>
                            <span className="text-xs font-black font-mono">
                                {formatTime(timeLeft)}
                            </span>
                        </button>

                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Market</span>
                            <span className="text-xs font-black text-emerald-600 font-mono">1.48k</span>
                        </div>

                        {/* Language Switcher */}
                        <button
                            onClick={toggleLanguage}
                            className="p-2 lg:px-3 lg:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors uppercase tracking-wider"
                        >
                            {locale === 'en' ? 'AR' : 'EN'}
                        </button>

                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
                            <ShieldCheck size={14} />
                            <span className="uppercase">{role}</span>
                        </div>

                        <div className="flex items-center gap-3 group cursor-pointer">
                            <div className="text-left hidden lg:block">
                                <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors uppercase">{role}</p>
                                <p className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">{user?.email}</p>
                            </div>
                            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 active:translate-y-0.5 transition-transform">
                                {user?.email?.[0].toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="p-4 lg:p-8 flex-1 overflow-y-auto w-full">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
