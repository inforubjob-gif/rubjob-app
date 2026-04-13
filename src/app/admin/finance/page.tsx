"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";

type TabType = 'revenue' | 'payouts';

export default function FinanceAdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('revenue');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'revenue') {
      fetchTransactions();
    } else {
      fetchPayouts();
    }
  }, [activeTab]);

  async function fetchTransactions() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/finance");
      const data = await res.json() as any;
      if (data.transactions) setTransactions(data.transactions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchPayouts() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/finance/payouts");
      const data = await res.json() as any;
      if (data.payouts) setPayouts(data.payouts);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function updatePayoutStatus(id: string, status: string) {
    try {
      const res = await fetch("/api/admin/finance/payouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        setPayouts(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      }
    } catch (err) {
      console.error("Failed to update payout", err);
    }
  }

  const totalGross = transactions.reduce((acc, t) => acc + (t.totalPrice || 0), 0);
  const totalPartnerCut = transactions.reduce((acc, t) => acc + ((t.totalPrice || 0) * 0.7), 0);
  const totalPlatformComission = totalGross - totalPartnerCut;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Accounting & Treasury</h1>
           <p className="text-slate-500 font-medium mt-1">Audit operational revenue and facilitate partner withdrawals</p>
        </div>
        <div className="flex gap-2">
            <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 flex items-center gap-2 hover:bg-emerald-700 transition-colors">
               <Icons.FileText size={16} /> Export Treasury Report
            </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <Card className="p-6 bg-white border border-slate-200/60 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-slate-900"><Icons.DollarSign size={48} /></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Gross Revenue</p>
            <p className="text-2xl font-black text-slate-900">฿{totalGross.toLocaleString()}</p>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase">
               <Icons.TrendingUp size={12} /> +12.5% vs Last Period
            </div>
         </Card>
         <Card className="p-6 bg-white border border-slate-200/60 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Partner Debt</p>
            <p className="text-2xl font-black text-rose-600">฿{totalPartnerCut.toLocaleString()}</p>
            <p className="mt-4 text-[10px] font-bold text-slate-400 italic">Simulated 70:30 Split Ratio</p>
         </Card>
         <Card className="p-6 bg-slate-900 text-white shadow-2xl shadow-slate-300 border-none">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Platform Commission (Net)</p>
            <p className="text-2xl font-black text-emerald-400">฿{totalPlatformComission.toLocaleString()}</p>
            <div className="mt-4 flex flex-wrap gap-2">
               <span className="text-[8px] font-black bg-white/10 px-2 py-0.5 rounded-full uppercase">Operational Profit</span>
            </div>
         </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 mb-6">
        <button 
          onClick={() => setActiveTab('revenue')}
          className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'revenue' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Revenue Audit
          {activeTab === 'revenue' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-lg shadow-primary/40 animate-in slide-in-from-bottom-1" />}
        </button>
        <button 
          onClick={() => setActiveTab('payouts')}
          className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'payouts' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Payout Requests
          {activeTab === 'payouts' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-lg shadow-primary/40 animate-in slide-in-from-bottom-1" />}
        </button>
      </div>

      {/* Table Section */}
      <Card className="bg-white border border-slate-200/60 shadow-xl overflow-hidden min-h-[500px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compiling Records...</p>
          </div>
        ) : activeTab === 'revenue' ? (
           transactions.length === 0 ? (
             <div className="text-center py-40">
                <Icons.FileText size={48} className="mx-auto text-slate-100 mb-4" />
                <p className="text-slate-300 font-black uppercase tracking-widest text-xs">No matching revenue records</p>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                   <tr>
                     <th className="px-8 py-5">Transaction Core</th>
                     <th className="px-8 py-5">Execution Date</th>
                     <th className="px-8 py-5 text-right">Gross Amount</th>
                     <th className="px-8 py-5 text-right">Commission (30%)</th>
                     <th className="px-8 py-5 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {transactions.map(tx => (
                     <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                       <td className="px-8 py-5">
                          <div>
                            <p className="font-mono text-[10px] text-slate-400 mb-1">{tx.id}</p>
                            <p className="font-black text-slate-900 text-sm">{tx.storeName || "Direct / Independent"}</p>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <p className="text-xs font-bold text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                       </td>
                       <td className="px-8 py-5 text-right font-black text-slate-900">฿{tx.totalPrice.toLocaleString()}</td>
                       <td className="px-8 py-5 text-right font-black text-emerald-600">฿{(tx.totalPrice * 0.3).toFixed(2)}</td>
                       <td className="px-8 py-5 text-right">
                          <button className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline">Verify Receipt</button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )
        ) : (
           /* Payout Requests View */
           payouts.length === 0 ? (
             <div className="text-center py-40">
                <Icons.CreditCard size={48} className="mx-auto text-slate-100 mb-4" />
                <p className="text-slate-300 font-black uppercase tracking-widest text-xs">Awaiting payout requests</p>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                   <tr>
                     <th className="px-8 py-5">Requester</th>
                     <th className="px-8 py-5">Payout Destination</th>
                     <th className="px-8 py-5 text-right">Requested Amount</th>
                     <th className="px-8 py-5">Status</th>
                     <th className="px-8 py-5 text-right">Operations</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {payouts.map(p => (
                     <tr key={p.id} className="hover:bg-indigo-50/20 transition-colors group">
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] text-white ${p.requesterType === 'store' ? 'bg-indigo-500' : 'bg-orange-500'}`}>
                                {p.requesterType === 'store' ? 'S' : 'R'}
                             </div>
                             <div>
                                <p className="font-black text-slate-900 text-sm">{p.requesterName}</p>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{p.requesterType}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <p className="text-xs font-black text-slate-700">{p.bankName}</p>
                          <p className="text-[10px] font-mono font-bold text-slate-400">{p.accountNumber} • {p.accountName}</p>
                       </td>
                       <td className="px-8 py-5 text-right font-black text-slate-900 text-lg">฿{p.amount.toLocaleString()}</td>
                       <td className="px-8 py-5">
                          <Badge variant={p.status === 'completed' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}>
                             {p.status}
                          </Badge>
                       </td>
                       <td className="px-8 py-5 text-right">
                          {p.status === 'pending' ? (
                             <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => updatePayoutStatus(p.id, 'completed')}
                                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all"
                                >
                                   Confirm Pay
                                </button>
                                <button 
                                  onClick={() => updatePayoutStatus(p.id, 'rejected')}
                                  className="px-4 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-rose-600 hover:border-rose-100 transition-all"
                                >
                                   Reject
                                </button>
                             </div>
                          ) : (
                             <span className="text-[9px] font-black text-slate-300 uppercase italic">Archived Sequence</span>
                          )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )
        )}
      </Card>
    </div>
  );
}
