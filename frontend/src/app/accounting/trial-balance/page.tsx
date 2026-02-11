"use client";

import TrialBalanceView from "@/components/TrialBalanceView";
import { PieChart } from "lucide-react";

export default function TrialBalancePage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-600 shadow-xl shadow-indigo-200 rounded-3xl text-white transform rotate-3">
                        <PieChart size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            Trial Balance
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-slate-500 text-xs font-black uppercase tracking-widest leading-none">Financial Statements</p>
                        </div>
                    </div>
                </div>
            </div>

            <TrialBalanceView />
        </div>
    );
}
