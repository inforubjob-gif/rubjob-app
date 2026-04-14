"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";

export default function UsersAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json() as any;
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRoleChange(id: string, newRole: string) {
    setUpdatingId(id);
    try {
      await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role: newRole })
      });
      // Optimistic update
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Failed to update role", err);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">User Management</h1>
           <p className="text-slate-500 text-sm md:text-base font-medium mt-1">View and manage customer, store, and rider accounts</p>
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm w-full md:w-auto">
           <div className="px-4 py-2 bg-slate-50 border-r border-slate-200 text-slate-500 font-bold text-sm flex items-center gap-2">
             <Icons.Search size={16} />
           </div>
           <input type="text" placeholder="Search ID or Name" className="px-4 py-2 outline-none text-sm font-medium flex-1 md:w-64" />
        </div>
      </header>

      <Card className="bg-white border border-slate-200/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">LINE ID</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                           {user.pictureUrl ? <img src={user.pictureUrl} alt="" className="w-full h-full object-cover" /> : <Icons.User size={16} className="text-slate-400" />}
                         </div>
                         <div className="font-bold text-slate-900">{user.displayName || "Unknown"}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium text-xs">{user.id.substring(0, 15)}...</td>
                    <td className="px-6 py-4">
                       <select 
                         value={user.role || 'user'} 
                         onChange={(e) => handleRoleChange(user.id, e.target.value)}
                         disabled={updatingId === user.id}
                         className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans outline-none border border-slate-200 cursor-pointer appearance-none ${user.role === 'store_admin' ? 'bg-blue-50 text-blue-700 border-blue-100' : user.role === 'driver' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-slate-50 text-slate-700'}`}
                       >
                          <option value="user">Customer</option>
                          <option value="store_admin">Store Admin</option>
                          <option value="driver">Rider (Driver)</option>
                       </select>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button className="text-slate-400 hover:text-primary transition-colors p-2 rounded-lg opacity-0 group-hover:opacity-100">
                         {/* Using a standard check icon or similar if MoreHorizontal is missing */}
                         <Icons.Check size={18} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
