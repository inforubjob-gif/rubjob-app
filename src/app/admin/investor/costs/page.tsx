"use client";

import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import { useState } from "react";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function InvestorCostsPage() {
   const { t } = useTranslation();
   const [scale, setScale] = useState(1000); // Monthly Order Projection

    const infrastructureCosts = [
      { name: t('admin.investor.costs.infrastructure.edgeHosting.name'), provider: "Cloudflare Business", cost: 7000, icon: <Icons.Globe size={24} />, detail: t('admin.investor.costs.infrastructure.edgeHosting.detail') },
      { name: t('admin.investor.costs.infrastructure.database.name'), provider: "Cloudflare D1 + KV", cost: 1800, icon: <Icons.Shield size={24} />, detail: t('admin.investor.costs.infrastructure.database.detail') },
      { name: t('admin.investor.costs.infrastructure.messaging.name'), provider: "LINE Official Pro", cost: 1500, icon: <Icons.Line size={24} />, detail: t('admin.investor.costs.infrastructure.messaging.detail') },
      { name: t('admin.investor.costs.infrastructure.routing.name'), provider: "Google Maps API", cost: 15000, icon: <Icons.Navigation size={24} />, detail: t('admin.investor.costs.infrastructure.routing.detail') },
    ];

    const totalFixedCost = infrastructureCosts.reduce((acc, curr) => acc + curr.cost, 0);
    const costPerOrder = totalFixedCost / scale;

    return (
      <div className="min-h-screen bg-[#0B0F19] text-white p-4 md:p-12 font-sans selection:bg-primary/30">
         <div className="max-w-6xl mx-auto space-y-12">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
               <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px] font-black uppercase tracking-widest">
                     <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                     {t('admin.investor.costs.tag')}
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                     {t('admin.investor.costs.titleMain')}<br/>
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-primary-light">
                        {t('admin.investor.costs.titleSub')}
                     </span>
                  </h1>
               </div>
               <div className="text-right hidden md:block">
                  <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{t('admin.investor.costs.assetVal')}</div>
                  <div className="text-3xl font-mono font-black text-white italic">{t('admin.investor.costs.priceless')}</div>
               </div>
            </div>

            {/* Main Stats Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-black border border-slate-800 rounded-xl p-10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
                  <div className="relative z-10 space-y-8">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center text-primary border border-white/10">
                           <Icons.TrendingUp size={32} />
                        </div>
                        <div>
                           <h3 className="text-xl font-black uppercase tracking-tighter">{t('admin.investor.costs.fixedBreakdown')}</h3>
                           <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{t('admin.investor.costs.fixedDesc')}</p>
                        </div>
                     </div>
                     <div className="flex items-baseline gap-4">
                        <span className="text-7xl font-mono font-black tracking-tighter">฿{totalFixedCost.toLocaleString()}</span>
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-sm">/ {t('admin.investor.costs.perMonth')}</span>
                     </div>
                     <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-8">
                        <div>
                           <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('admin.investor.costs.maxCapacity')}</div>
                           <div className="text-2xl font-black font-mono">1,000,000+</div>
                        </div>
                        <div>
                           <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('admin.investor.costs.reliability')}</div>
                           <div className="text-2xl font-black font-mono text-emerald-400">99.99%</div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-primary rounded-xl p-10 flex flex-col justify-between text-slate-900 relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-black/5 rounded-full translate-y-1/4 translate-x-1/4" />
                  <div className="relative z-10">
                     <Icons.Wallet size={48} strokeWidth={3} />
                     <h3 className="mt-6 text-3xl font-black tracking-tighter uppercase leading-none">{t('admin.investor.costs.scalability')}<br/>{t('admin.investor.costs.efficiency')}</h3>
                     <p className="mt-4 text-xs font-bold uppercase tracking-widest leading-relaxed opacity-70">
                        {t('admin.investor.costs.efficiencySub')}
                     </p>
                  </div>
                  <div className="mt-12 pt-6 border-t border-black/10">
                     <div className="text-[10px] font-black uppercase tracking-widest mb-2">{t('admin.investor.costs.cloudCostPerOrder')}</div>
                     <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-mono font-black italic tracking-tighter">฿{costPerOrder.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span className="text-xs font-black uppercase">/ {t('admin.investor.costs.perOrder')}</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Service Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {infrastructureCosts.map((item, idx) => (
                  <Card key={idx} className="bg-slate-900/40 border-slate-800/50 hover:border-primary/50 p-8 rounded-xl transition-all duration-300 group">
                     <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 mb-6 group-hover:bg-primary group-hover:text-slate-900 transition-all duration-500 shadow-xl shadow-black/50">
                        {item.icon}
                     </div>
                     <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-1">{item.name}</h4>
                     <div className="text-xl font-black text-white mb-2">{item.provider}</div>
                     <div className="text-xs font-bold text-slate-500 mb-6 leading-relaxed uppercase tracking-tight h-10 overflow-hidden line-clamp-2">
                        {item.detail}
                     </div>
                     <div className="text-2xl font-mono font-black text-primary">
                        ฿{item.cost.toLocaleString()}
                     </div>
                  </Card>
               ))}
            </div>

            {/* Investor Projection Interaction */}
            <div className="bg-gradient-to-r from-indigo-950 to-slate-950 border border-indigo-900/30 rounded-xl p-10">
               <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="flex-1 space-y-6">
                     <div className="flex items-baseline gap-3">
                        <h2 className="text-3xl font-black uppercase tracking-tight">{t('admin.investor.costs.growthProjection')}</h2>
                        <span className="text-indigo-400 text-xs font-black uppercase tracking-widest tracking-widest">{t('admin.investor.costs.growthProjection')}</span>
                     </div>
                     <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-lg">
                        {t('admin.investor.costs.growthDesc')}
                     </p>
                     
                     <div className="space-y-4 pt-4">
                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                           <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t('admin.investor.costs.orderInputLabel')}</span>
                           <span className="text-lg font-mono font-black text-primary">{scale.toLocaleString()}</span>
                        </div>
                        <input 
                           type="range" min="1000" max="100000" step="1000"
                           value={scale}
                           onChange={(e) => setScale(parseInt(e.target.value))}
                           className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest">
                           <span>{t('admin.investor.costs.mvpStage')}</span>
                           <span>{t('admin.investor.costs.growthStage')}</span>
                           <span>{t('admin.investor.costs.marketLeader')}</span>
                        </div>
                     </div>
                  </div>

                  <div className="w-full md:w-80 bg-black/40 border border-white/5 rounded-xl p-8 space-y-8 backdrop-blur-xl">
                     <div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('admin.investor.costs.efficiencyGain')}</div>
                        <div className="text-4xl font-mono font-black italic color-indigo-400">
                           {((totalFixedCost / 1000 - costPerOrder) / (totalFixedCost / 1000) * 100).toFixed(1)}%
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">{t('admin.investor.costs.costReduction')}</div>
                     </div>
                     <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                           <span className="text-[10px] font-black uppercase text-slate-500">{t('admin.investor.costs.fixedCap')}</span>
                           <span className="text-sm font-mono font-black">{t('admin.investor.costs.unlimited')}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                           <span className="text-[10px] font-black uppercase text-slate-500">{t('admin.investor.costs.securityRank')}</span>
                           <span className="text-sm font-mono font-black">Tier 4</span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                           <span className="text-[10px] font-black uppercase text-slate-500">{t('admin.investor.costs.latency')}</span>
                           <span className="text-sm font-mono font-black text-emerald-400">&lt;15ms</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Footer Call to Action */}
            <div className="text-center pt-12 pb-24">
               <p className="text-slate-600 text-xs font-bold uppercase tracking-[0.4em] mb-8">{t('admin.investor.costs.footerTag')}</p>
               <div className="flex justify-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-slate-800" />
                  <div className="w-3 h-3 rounded-full bg-slate-800" />
                  <div className="w-3 h-3 rounded-full bg-primary" />
               </div>
            </div>

         </div>
      </div>
    );
}
