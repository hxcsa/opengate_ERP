"use client";
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, ArrowRight, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const { t, toggleLanguage, locale } = useLanguage();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] relative overflow-hidden font-sans selection:bg-indigo-500/30 text-slate-200">

            {/* Language Switcher (Absolute Top Corner) */}
            <button
                onClick={toggleLanguage}
                className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full backdrop-blur-md transition-all text-xs font-bold text-slate-300 hover:text-white"
            >
                <Globe size={14} />
                <span>{locale === 'en' ? 'العربية' : 'English'}</span>
            </button>

            {/* --- CSS/Tailwind Aurora Background --- */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Top Left Blue Glow */}
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse duration-[4000ms]"></div>
                {/* Bottom Right Indigo Glow */}
                <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] animate-pulse duration-[6000ms]"></div>
                {/* Center Cyan Highlight */}
                <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-cyan-900/10 rounded-full blur-[80px] animate-bounce duration-[10000ms]"></div>
            </div>

            {/* --- Main Glass Card --- */}
            <div className="relative z-10 w-full max-w-[400px] p-8 mx-4">

                {/* Logo Section */}
                <div className="flex flex-col items-center mb-10">
                    <div className="group relative w-20 h-20 mb-6 flex items-center justify-center">
                        {/* Logo Glow */}
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/30 transition-all duration-500"></div>
                        <Image
                            src="/images/logo_minimal.png"
                            alt="OpenGate"
                            width={64}
                            height={64}
                            className="relative z-10 drop-shadow-2xl"
                        />
                    </div>
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight text-white">
                            {isSignUp ? t("createAccount") : t("welcomeBack")}
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            {isSignUp ? t("joinNetwork") : t("signInToAccess")}
                        </p>
                    </div>
                </div>

                {/* Form Section */}
                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Email Input */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-1">{t("emailLabel")}</label>
                        <div className="relative">
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3.5 bg-[#0a0a0a] border border-[#222] rounded-xl text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                                placeholder="name@company.com"
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-1">{t("passwordLabel")}</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3.5 bg-[#0a0a0a] border border-[#222] rounded-xl text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                            placeholder="••••••••"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 rounded-lg bg-red-900/10 border border-red-900/20 text-red-400 text-xs font-semibold text-center animate-in fade-in slide-in-from-top-1">
                            {error}
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 mt-2 rounded-xl bg-white text-black font-bold text-sm tracking-wide hover:bg-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <>
                                <span>{isSignUp ? t("getStartedBtn") : t("signInBtn")}</span>
                                <ArrowRight size={16} className={locale === 'ar' ? 'rotate-180' : ''} />
                            </>
                        )}
                    </button>

                    {/* Toggle Mode */}
                    <div className="pt-6 text-center">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-xs text-slate-500 hover:text-white transition-colors font-medium"
                        >
                            {isSignUp ? t("alreadyHaveAccount") : t("dontHaveAccount")}
                        </button>
                    </div>

                </form>

                {/* Footer / Copyright */}
                <div className="mt-12 text-center">
                    <p className="text-[10px] text-slate-700 font-bold tracking-widest uppercase">
                        {t("copyright")}
                    </p>
                </div>

            </div>
        </div>
    );
}
