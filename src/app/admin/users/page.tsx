"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";
import Modal from "@/components/ui/Modal";

export default function UsersAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Modal State
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const term = search.toLowerCase();
    setFilteredUsers(
      users.filter(u => 
        u.displayName?.toLowerCase().includes(term) || 
        u.id.toLowerCase().includes(term)
      )
    );
  }, [search, users]);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json() as any;
      if (data.users) {
        setUsers(data.users);
        setFilteredUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateUser(updates: any) {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedUser.id, ...updates })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...updates } : u));
        setIsModalOpen(false);
        setSelectedUser(null);
      }
    } catch (err) {
      console.error("Failed to update user", err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteUser(id: string, name: string) {
    if (!confirm(`Are you absolutely sure you want to delete account "${name || 'Unknown'}"? This action is permanent and cannot be undone.`)) return;
    
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
        setIsModalOpen(false);
        setSelectedUser(null);
      } else {
        alert("Failed to delete user. They might have active orders or other linked data.");
      }
    } catch (err) {
      console.error("Failed to delete user", err);
    } finally {
      setIsSaving(false);
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
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Failed to update role", err);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
           <p className="text-slate-500 text-sm md:text-base font-medium mt-1">Manage customer points, roles, and account details</p>
        </div>
        <div className="flex bg-white border border-slate-200 rounded-[1.25rem] overflow-hidden shadow-sm w-full md:w-80 group focus-within:ring-4 focus-within:ring-primary/10 transition-all">
           <div className="px-5 py-3 bg-slate-50 border-r border-slate-100 text-slate-400 group-focus-within:text-primary transition-colors flex items-center shrink-0">
             <Icons.Search size={18} />
           </div>
           <input 
             type="text" 
             placeholder="Search Name or LINE ID..." 
             className="px-5 py-3 outline-none text-sm font-bold flex-1 bg-white" 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
      </header>

      <Card className="bg-white border border-slate-200/60 shadow-xl shadow-slate-200/20 rounded-[2.5rem] overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-32">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/80 backdrop-blur-sm text-slate-400 font-black uppercase text-[10px] tracking-[0.15em] border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">User Profile</th>
                  <th className="px-8 py-5">Account Status</th>
                  <th className="px-8 py-5">Points</th>
                  <th className="px-8 py-5">Activity</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm ring-4 ring-white">
                           {user.pictureUrl ? <img src={user.pictureUrl} alt="" className="w-full h-full object-cover" /> : <Icons.User size={20} className="text-slate-300" />}
                         </div>
                         <div>
                            <div className="font-black text-slate-900 tracking-tight">{user.displayName || "Unknown User"}</div>
                            <div className="text-[10px] font-bold text-slate-400 mt-0.5 font-mono">{user.id.substring(0, 12)}...</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <select 
                         value={user.role || 'user'} 
                         onChange={(e) => handleRoleChange(user.id, e.target.value)}
                         disabled={updatingId === user.id}
                         className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border transition-all cursor-pointer appearance-none ${user.role === 'store_admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm' : user.role === 'driver' ? 'bg-orange-50 text-orange-600 border-orange-100 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                       >
                          <option value="user">Customer</option>
                          <option value="store_admin">Store Partner</option>
                          <option value="driver">Rider Agent</option>
                       </select>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-2">
                          <div className="bg-amber-50 text-amber-600 w-8 h-8 rounded-lg flex items-center justify-center border border-amber-100 shadow-sm font-black text-xs">
                             <Icons.Ticket size={14} />
                          </div>
                          <span className="font-black text-slate-900">{user.points || 0}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Joined</span>
                          <span className="text-xs font-bold text-slate-600 mt-0.5">{new Date(user.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleDeleteUser(user.id, user.displayName)}
                            className="bg-slate-50 hover:bg-rose-50 text-slate-300 hover:text-rose-500 w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:bg-rose-50/50"
                          >
                            <Icons.Trash size={18} />
                          </button>
                          <button 
                            onClick={() => { setSelectedUser(user); setIsModalOpen(true); }}
                            className="bg-slate-100 hover:bg-primary hover:text-white text-slate-500 w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95"
                          >
                            <Icons.ArrowRight size={18} />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="py-20 text-center">
                 <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Icons.Search size={32} />
                 </div>
                 <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No matching users found</p>
                 <button onClick={() => setSearch("")} className="mt-2 text-primary font-bold text-xs hover:underline decoration-2 underline-offset-4">Clear search</button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* User Detail Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="User Intelligence Detail"
      >
        {selectedUser && (
          <div className="space-y-8 py-2">
             <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="w-24 h-24 rounded-[2rem] bg-white border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-xl relative z-10">
                   {selectedUser.pictureUrl ? <img src={selectedUser.pictureUrl} alt="" className="w-full h-full object-cover" /> : <Icons.User size={40} className="text-slate-200" />}
                </div>
                <div className="relative z-10">
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedUser.displayName}</h2>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Platform Account ID</p>
                   <code className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-100 mt-1.5 block w-fit font-mono font-bold text-primary">{selectedUser.id}</code>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Name</label>
                   <input 
                     type="text" 
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black focus:border-primary outline-none transition-all"
                     value={selectedUser.displayName}
                     onChange={(e) => setSelectedUser({...selectedUser, displayName: e.target.value})}
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Points</label>
                   <div className="relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-500">
                         <Icons.Ticket size={18} />
                      </div>
                      <input 
                        type="number" 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-black focus:border-primary outline-none transition-all"
                        value={selectedUser.points}
                        onChange={(e) => setSelectedUser({...selectedUser, points: parseInt(e.target.value) || 0})}
                      />
                   </div>
                </div>
             </div>

             <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Linked Role</p>
                   <p className="text-lg font-black text-slate-900 mt-1 uppercase tracking-tight">{selectedUser.role?.replace('_', ' ') || 'Customer'}</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => handleDeleteUser(selectedUser.id, selectedUser.displayName)}
                      className="flex-1 sm:flex-none border-2 border-rose-100 text-rose-500 hover:bg-rose-50 px-6 py-4 rounded-2xl font-black text-sm transition-all uppercase tracking-widest"
                    >
                      Delete Account
                    </button>
                    <button 
                      onClick={() => handleUpdateUser({ displayName: selectedUser.displayName, points: selectedUser.points })}
                      disabled={isSaving}
                      className="flex-1 sm:flex-none bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                    >
                      {isSaving ? "Saving..." : "Update Intelligence"}
                    </button>
                 </div>
              </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
