"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { Users, UserPlus, Shield, Mail, Key, X } from "lucide-react";

export default function UsersPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("accountant");
    const [message, setMessage] = useState("");

    const fetchEmployees = async () => {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch("/api/users", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setEmployees(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        const user = auth.currentUser;
        if (!user) return;

        const token = await user.getIdToken();
        const res = await fetch(`/api/users?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&role=${role}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            setMessage("Employee added successfully!");
            setEmail("");
            setPassword("");
            fetchEmployees();
        } else {
            const err = await res.json();
            setMessage(`Error: ${err.detail}`);
        }
    };

    const handleUpdateRole = async (uid: string, newRole: string) => {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        await fetch(`/api/users/${uid}?role=${newRole}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` }
        });
        fetchEmployees();
    };

    const handleDeleteUser = async (uid: string) => {
        if (!confirm("Are you sure you want to delete this account? / هل أنت متأكد من حذف الحساب؟")) return;
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        await fetch(`/api/users/${uid}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        fetchEmployees();
    };

    return (
        <div className="space-y-8" dir="rtl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Manage Employees / إدارة الموظفين</h1>
                    <p className="text-slate-500 font-medium">Add and manage user permissions</p>
                </div>
                <div className="bg-blue-600/10 p-3 rounded-2xl">
                    <Users className="text-blue-600" size={32} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Employee Form */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                        <UserPlus className="text-blue-600" size={20} />
                        <h2 className="font-bold text-slate-800">Add New Employee</h2>
                    </div>

                    <form onSubmit={handleAddEmployee} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black text-slate-400 px-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="employee@company.com"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black text-slate-400 px-1">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                placeholder="Min 6 characters"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black text-slate-400 px-1">Role / الصلاحية</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                            >
                                <option value="accountant">Accountant / محاسب</option>
                                <option value="storekeeper">Storekeeper / أمين مخزن</option>
                                <option value="viewer">Viewer / مشاهد</option>
                                <option value="admin">Admin / مدير</option>
                            </select>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl text-xs font-bold text-center ${message.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-4 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 mt-2"
                        >
                            Create Employee Account
                        </button>
                    </form>
                </div>

                {/* Employee List */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-[10px] uppercase font-black text-slate-400">Employee</th>
                                <th className="p-4 text-[10px] uppercase font-black text-slate-400">Role</th>
                                <th className="p-4 text-[10px] uppercase font-black text-slate-400">Created At</th>
                                <th className="p-4 text-[10px] uppercase font-black text-slate-400">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading...</td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">No employees found</td></tr>
                            ) : employees.map((emp) => (
                                <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                                                {emp.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{emp.email}</p>
                                                <p className="text-[10px] text-slate-400 font-medium font-mono uppercase tracking-tighter">UID: {emp.id.slice(0, 8)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <select
                                            value={emp.role}
                                            onChange={(e) => handleUpdateRole(emp.id, e.target.value)}
                                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20 ${emp.role === 'admin' ? 'bg-purple-50 text-purple-700' :
                                                emp.role === 'accountant' ? 'bg-blue-50 text-blue-700' :
                                                    'bg-slate-50 text-slate-700'
                                                }`}
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="accountant">Accountant</option>
                                            <option value="storekeeper">Storekeeper</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-xs text-slate-500 font-medium">
                                        {emp.created_at ? new Date(emp.created_at.seconds * 1000).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => handleDeleteUser(emp.id)}
                                            className="text-slate-300 hover:text-red-500 transition-colors p-2"
                                        >
                                            <X size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
