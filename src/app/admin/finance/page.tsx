"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

type TabType = 'revenue' | 'payouts';

export default function FinanceAdminPage() {
  const { t } = useTranslation();
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
  const totalPlatformComission = transactions.reduce((acc, t) => {
    const gp = t.gpPercent ? t.gpPercent / 100 : 0.3;
    return acc + (t.totalPrice * gp);
  }, 0);
  const totalPartnerCut = totalGross - totalPlatformComission;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">{t('admin.finance.title')}</h1>
           <p className="text-slate-500 text-sm md:text-base font-medium mt-1">{t('admin.finance.subtitle')}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <button className="px-5 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors w-full sm:w-auto">
               <Icons.FileText size={16} /> {t('admin.finance.exportBtn')}
            </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <Card className="p-6 bg-white border border-slate-200/60 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-slate-900"><Icons.DollarSign size={48} /></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('admin.finance.stats.gross')}</p>
            <p className="text-2xl font-black text-slate-900">฿{totalGross.toLocaleString()}</p>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase">
               <Icons.TrendingUp size={12} /> +12.5% vs Last Period
            </div>
         </Card>
         <Card className="p-6 bg-white border border-slate-200/60 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('admin.finance.stats.partnerDebt')}</p>
            <p className="text-2xl font-black text-rose-600">฿{totalPartnerCut.toLocaleString()}</p>
            <p className="mt-4 text-[10px] font-bold text-slate-400 italic">Simulated 70:30 Split Ratio</p>
         </Card>
         <Card className="p-6 bg-slate-900 text-white shadow-2xl shadow-slate-300 border-none">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('admin.finance.stats.platformCom')}</p>
            <p className="text-2xl font-black text-emerald-400">฿{totalPlatformComission.toLocaleString()}</p>
            <div className="mt-4 flex flex-wrap gap-2">
               <span className="text-[8px] font-black bg-white/10 px-2 py-0.5 rounded-full uppercase">{t('admin.finance.stats.profit')}</span>
            </div>
         </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 mb-6 overflow-x-auto no-scrollbar whitespace-nowrap">
        <button 
          onClick={() => setActiveTab('revenue')}
          className={`pb-4 text-[11px] font-black uppercase tracking-widest transition-all relative shrink-0 ${activeTab === 'revenue' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          {t('admin.finance.tabs.revenue')}
          {activeTab === 'revenue' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-lg shadow-primary/40 animate-in slide-in-from-bottom-1" />}
        </button>
        <button 
          onClick={() => setActiveTab('payouts')}
          className={`pb-4 text-[11px] font-black uppercase tracking-widest transition-all relative shrink-0 ${activeTab === 'payouts' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          {t('admin.finance.tabs.payouts')}
          {activeTab === 'payouts' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-lg shadow-primary/40 animate-in slide-in-from-bottom-1" />}
        </button>
      </div>

      {/* Table Section */}
      <Card className="bg-white border border-slate-200/60 shadow-xl overflow-hidden min-h-[500px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin.finance.loading')}</p>
          </div>
        ) : activeTab === 'revenue' ? (
           transactions.length === 0 ? (
             <div className="text-center py-40">
                <Icons.FileText size={48} className="mx-auto text-slate-100 mb-4" />
                <p className="text-slate-300 font-black uppercase tracking-widest text-xs">{t('admin.finance.empty.revenue')}</p>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                   <tr>
                     <th className="px-8 py-5">{t('admin.finance.table.txCore')}</th>
                     <th className="px-8 py-5">{t('admin.finance.table.date')}</th>
                     <th className="px-8 py-5 text-right">{t('admin.finance.table.gross')}</th>
                     <th className="px-8 py-5 text-right">{t('admin.finance.table.commission')}</th>
                     <th className="px-8 py-5 text-right">{t('admin.finance.table.actions')}</th>
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
                       <td className="px-8 py-5 text-right font-black text-emerald-600">
                          ฿{(tx.totalPrice * (tx.gpPercent ? tx.gpPercent / 100 : 0.3)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       </td>
                       <td className="px-8 py-5 text-right">
                          <button className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline">{t('admin.finance.action.verify')}</button>
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
                <p className="text-slate-300 font-black uppercase tracking-widest text-xs">{t('admin.finance.empty.payouts')}</p>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                   <tr>
                     <th className="px-8 py-5">{t('admin.finance.table.requester')}</th>
                     <th className="px-8 py-5">{t('admin.finance.table.destination')}</th>
                     <th className="px-8 py-5 text-right">{t('admin.finance.table.amount')}</th>
                     <th className="px-8 py-5">{t('admin.finance.table.status')}</th>
                     <th className="px-8 py-5 text-right">{t('admin.finance.table.operations')}</th>
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
                             {p.status === 'completed' ? t('common.done') : p.status === 'pending' ? t('common.pending') : t('common.error')}
                          </Badge>
                       </td>
                       <td className="px-8 py-5 text-right">
                          {p.status === 'pending' ? (
                             <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => updatePayoutStatus(p.id, 'completed')}
                                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all"
                                >
                                   {t('admin.finance.action.confirm')}
                                </button>
                                <button 
                                  onClick={() => updatePayoutStatus(p.id, 'rejected')}
                                  className="px-4 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-rose-600 hover:border-rose-100 transition-all"
                                >
                                   {t('admin.finance.action.reject')}
                                </button>
                             </div>
                          ) : (
                             <span className="text-[9px] font-black text-slate-300 uppercase italic">{t('admin.finance.status.archived')}</span>
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
