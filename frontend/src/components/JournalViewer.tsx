"use client";

import { useEffect, useState } from "react";
import { X, Book, Search, Calendar, Hash, FileText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface JournalViewerProps {
    onClose: () => void;
}

export default function JournalViewer({ onClose }: JournalViewerProps) {
    const [journals, setJournals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { t, locale } = useLanguage();

    useEffect(() => {
        fetch("/api/accounting/journals?limit=100")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setJournals(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filtered = journals.filter(j =>
        j.number?.includes(searchTerm) ||
        j.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col animate-in zoom-in duration-200">
                <div className="p-6 bg-slate-800 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <Book size={20} />
                        <div>
                            <h3 className="text-lg font-bold">{t("postedJournals")}</h3>
                            <p className="text-[10px] opacity-70 font-mono tracking-widest uppercase">{journals.length} ENTRIES FOUND</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
                </div>

                <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            placeholder="Search by number or description..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/10 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                            <Book className="animate-pulse" size={48} />
                            <p className="font-bold">{t("loading")}</p>
                        </div>
                    ) : (
                        <div className="p-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                        <th className="px-6 py-4">Number</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-4 text-right">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((j) => (
                                        <JournalRow key={j.id} journal={j} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function JournalRow({ journal }: { journal: any }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            <tr
                onClick={() => setExpanded(!expanded)}
                className={`cursor-pointer hover:bg-blue-50/50 transition-all ${expanded ? 'bg-blue-50/30' : ''}`}
            >
                <td className="px-6 py-4 font-mono text-xs font-black text-blue-600">{journal.number}</td>
                <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                    {journal.date?.seconds ? new Date(journal.date.seconds * 1000).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-700">{journal.description}</td>
                <td className="px-6 py-4 text-right">
                    <button className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors">
                        {expanded ? 'Hide Lines' : 'View Lines'}
                    </button>
                </td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={4} className="px-10 py-4 bg-slate-50/30 border-y border-slate-100 shadow-inner">
                        <div className="grid grid-cols-1 gap-1">
                            {journal.lines?.map((line: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center py-2 text-xs border-b border-slate-100 last:border-0">
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-[10px] text-slate-400">#{idx + 1}</span>
                                        <span className="font-bold text-slate-800">{line.account_id}</span>
                                        <span className="text-slate-500 italic">{line.description}</span>
                                    </div>
                                    <div className="flex gap-8 font-mono font-black tabular-nums">
                                        <div className="w-24 text-right text-emerald-600">
                                            {Number(line.debit) > 0 ? Number(line.debit).toLocaleString() : ''}
                                        </div>
                                        <div className="w-24 text-right text-rose-600">
                                            {Number(line.credit) > 0 ? Number(line.credit).toLocaleString() : ''}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
