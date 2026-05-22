"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import PinLock from "@/components/PinLock";
import GlobalInput from "@/components/ui/GlobalInput";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function RubberWalletPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [pendingCashAdvance, setPendingCashAdvance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [yearlyEarnings, setYearlyEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; type: "success" | "error" | "warning" }>({
    isOpen: false,
    title: "",
    message: "",
    type: "error",
  });

  const [rubberSession, setRubberSession] = useState<any>(null);

  useEffect(() => {
    try {
      const localSession = localStorage.getItem("rubjob_rubber_session");
      if (localSession) {
        const parsed = JSON.parse(localSession);
        setRubberSession(parsed);
      } else {
        window.location.href = "/rubber/login";
      }
    } catch (err) {
      console.error("Session parse error:", err);
      window.location.href = "/rubber/login";
    }
  }, []);

  useEffect(() => {
    if (rubberSession?.id) {
      fetchWalletData();
    }
  }, [rubberSession]);

  const fetchWalletData = async () => {
    if (!rubberSession?.id) return;
    try {
      const res = await fetch(`/api/rubber/wallet?rubberId=${rubberSession.id}`);
      const data = await res.json() as any;
      if (data.balance !== undefined) setBalance(data.balance);
      if (data.monthlyEarnings !== undefined) setMonthlyEarnings(data.monthlyEarnings);
      if (data.yearlyEarnings !== undefined) setYearlyEarnings(data.yearlyEarnings);
      if (data.pendingCashAdvance !== undefined) setPendingCashAdvance(data.pendingCashAdvance);
      if (data.transactions) setTransactions(data.transactions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || !bankName || !accountNumber) {
      setAlertConfig({
        isOpen: true,
        title: t("common.error"),
        message: t("rubber.wallet.alertBankInfo"),
        type: "error",
      });
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch("/api/rubber/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rubberId: rubberSession.id,
          amount: parseFloat(amount),
          bankName,
          accountNumber,
          accountName
        })
      });
      if (res.ok) {
        setIsSuccess(true);
        fetchWalletData();
      } else {
        const data = await res.json() as any;
        setAlertConfig({
          isOpen: true,
          title: t("common.error"),
          message: data.error || t("common.errorDesc"),
          type: "error",
        });
      }
    } catch (err) {
      console.error(err);
      setAlertConfig({
        isOpen: true,
        title: t("common.error"),
        message: t("common.errorDesc"),
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsSuccess(false);
    setAmount("");
  };

  return (
    <PinLock type="rubber" onVerified={() => {}}>
      <div className="flex flex-col min-h-dvh bg-slate-50">
        <header className="bg-primary text-white px-5 pt-4 pb-6 rounded-b-[3rem] shadow-xl relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            {/* Cash Advance badge — top right corner */}
            {pendingCashAdvance > 0 && (
              <div className="absolute top-0 right-0 bg-white/20 text-white/70 text-[9px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <span>สำรองจ่าย ฿{pendingCashAdvance.toLocaleString()}</span>
              </div>
            )}
            <p className="text-[10px] font-black text-white/50 uppercase mb-2">{t("rubber.wallet.balance")}</p>
            <div className="flex items-baseline justify-center gap-2 mb-8 text-white">
              <span className="text-5xl font-black drop-shadow-md">฿{(Number(balance) || 0).toLocaleString()}</span>
            </div>
            <div className="flex gap-3 max-w-xs mx-auto">
               <Button 
                 onClick={() => setIsModalOpen(true)}
                 className="flex-1 bg-white/20 backdrop-blur-lg text-white border border-white/40 shadow-xl py-4 font-black text-sm uppercase active:scale-95 transition-all"
               >
                  <Icons.Payment size={18} className="mr-2" /> {t("rubber.wallet.withdraw")}
               </Button>
               <button onClick={() => document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })} className="w-14 h-14 shrink-0 relative z-20 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 active:scale-95 transition-transform shadow-lg">
                  <Icons.Clock size={20} className="text-white" />
               </button>
               <button onClick={() => router.push('/rubber/profile/payout-method')} className="w-14 h-14 shrink-0 relative z-20 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 active:scale-95 transition-transform shadow-lg">
                  <Icons.Settings size={20} className="text-white" />
               </button>
            </div>
          </div>
        </header>

        <div className="flex-1 px-5 py-8 space-y-6 pb-24 animate-page-enter">
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 px-2">{t("rubber.wallet.earningsInsight") || "Earnings Insight"}</h2>
            <Card className="p-6 bg-white border border-slate-100 shadow-2xl rounded-[2.5rem]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{t("rubber.wallet.weeklyPerformance") || "Weekly Performance"}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t("rubber.wallet.last7Days") || "Last 7 Days"}</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Icons.Stars size={20} />
                </div>
              </div>

              {/* Chart Implementation */}
              <div className="flex items-end justify-between h-32 gap-2 mb-6">
                {(() => {
                  const last7Days = [...Array(7)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return d;
                  });

                  const dayEarnings = last7Days.map(date => {
                    const dayStr = date.toDateString();
                    const total = transactions
                      .filter(tx => tx.amount > 0 && (() => {
                        // SQLite dates lack Z suffix — normalize before comparing
                        const raw = tx.date || '';
                        const safe = raw.includes('Z') ? raw : raw.replace(' ', 'T') + 'Z';
                        return new Date(safe).toDateString() === dayStr;
                      })())
                      .reduce((acc: number, tx: any) => acc + Number(tx.amount), 0);
                    return { date, total };
                  });

                  const maxEarning = Math.max(...dayEarnings.map(d => d.total), 1);

                  return dayEarnings.map((d, i) => {
                    const height = (d.total / maxEarning) * 100;
                    const isToday = d.date.toDateString() === new Date().toDateString();
                    
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group cursor-pointer">
                        <div className="relative w-full flex flex-col items-center justify-end h-full">
                           {/* Tooltip on hover */}
                           <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                             ฿{d.total.toLocaleString()}
                           </div>
                           {/* Bar */}
                           <div 
                             className={`w-6 sm:w-8 rounded-t-xl transition-all duration-700 ease-out ${isToday ? 'bg-primary shadow-lg shadow-primary/30' : d.total > 0 ? 'bg-primary/40' : 'bg-slate-100'} group-hover:bg-primary/60`}
                             style={{ height: `${d.total > 0 ? Math.max(height, 15) : 8}%` }}
                           />
                        </div>
                        <span className={`text-[9px] font-black uppercase ${isToday ? 'text-primary' : 'text-slate-400'}`}>
                          {d.date.toLocaleDateString(language === 'en' ? 'en-US' : 'th-TH', { weekday: 'short' })}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Monthly/Yearly Summary */}
              <div className="flex items-center gap-4 border-t border-slate-50 pt-4 pb-2 mb-2">
                 <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t("rubber.wallet.monthlyEarnings") || "Monthly"}</p>
                    <p className="text-sm font-black text-emerald-500">฿{monthlyEarnings.toLocaleString()}</p>
                 </div>
                 <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t("rubber.wallet.yearlyEarnings") || "Yearly"}</p>
                    <p className="text-sm font-black text-primary">฿{yearlyEarnings.toLocaleString()}</p>
                 </div>
              </div>

              {/* Today's Breakdown */}
              <div className="border-t border-slate-50 pt-6">
                 <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("rubber.wallet.timeBreakdown") || "Time Breakdown (Today)"}</p>
                    <p className="text-[10px] font-black text-emerald-500 uppercase">{t("rubber.wallet.realTime") || "Real-time"}</p>
                 </div>
                 <div className="space-y-3">
                    {(() => {
                      const todayStr = new Date().toDateString();
                      const todayTrx = transactions
                        .filter(tx => tx.amount > 0 && (() => {
                          const raw = tx.date || '';
                          const safe = raw.includes('Z') ? raw : raw.replace(' ', 'T') + 'Z';
                          return new Date(safe).toDateString() === todayStr;
                        })())
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                      if (todayTrx.length === 0) {
                        return <p className="text-center py-4 text-[10px] text-slate-300 font-bold uppercase italic">{t("rubber.wallet.noEarningsToday") || "No earnings yet today"}</p>;
                      }

                      return todayTrx.map((tx, idx) => {
                        const raw = tx.date || '';
                        const safe = raw.includes('Z') ? raw : raw.replace(' ', 'T') + 'Z';
                        
                        return (
                          <div key={idx} className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
                                  {new Date(safe).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                           </div>
                           <p className="text-xs font-black text-slate-900">฿{Number(tx.amount).toLocaleString()}</p>
                         </div>
                       );
                     });
                    })()}
                 </div>
              </div>
            </Card>
          </section>



          <section id="history-section">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 px-2">{t("rubber.wallet.history")}</h2>
            <div className="space-y-3">
              {transactions.map((trx) => {
                const raw = trx.date || '';
                const safe = raw.includes('Z') ? raw : raw.replace(' ', 'T') + 'Z';
                const isCashAdvance = trx.type === 'Cash Advance';
                const isEarning = trx.amount > 0;
                const isWithdrawal = trx.type === 'Withdrawal';

                // Icon & color logic
                let iconBg = 'bg-slate-100 text-slate-600';
                let icon = <Icons.Clock size={20} />;
                if (isEarning) {
                  iconBg = 'bg-emerald-50 text-emerald-500';
                  icon = <Icons.Payment size={20} />;
                } else if (isCashAdvance) {
                  iconBg = 'bg-amber-50 text-amber-500';
                  icon = <span className="text-lg">💵</span>;
                } else if (isWithdrawal) {
                  iconBg = 'bg-slate-100 text-slate-600';
                  icon = <Icons.Payment size={20} />;
                }

                // Label
                let label = t(`rubber.wallet.types.${trx.type}`) || trx.type;
                if (isCashAdvance && trx.meta) {
                  const machine = trx.meta.machineType === 'washer' ? 'ซัก' : 'อบ';
                  label = `สำรองจ่าย — ${machine} ${trx.meta.machineSizeKg}kg`;
                }

                // Sub-label
                let subLabel = '';
                if (isCashAdvance && trx.meta?.storeName) {
                  subLabel = trx.meta.storeName;
                }

                return (
                  <div key={trx.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center ${iconBg}`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{label}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase truncate">
                        {subLabel ? `${subLabel} • ` : ''}
                        {new Date(safe).toLocaleDateString('th-TH', { 
                          day: 'numeric', 
                          month: 'short', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black ${isEarning ? 'text-emerald-500' : isCashAdvance ? 'text-amber-600' : 'text-slate-900'}`}>
                      {isEarning ? `+฿${(Number(trx.amount) || 0).toLocaleString()}` : `-฿${(Math.abs(Number(trx.amount) || 0)).toLocaleString()}`}
                    </p>
                    <Badge variant={trx.status?.toLowerCase() === 'completed' || trx.status?.toLowerCase() === 'success' ? 'success' : trx.status?.toLowerCase() === 'rejected' ? 'danger' : 'warning'} className="text-[8px] font-black uppercase py-0.5 px-2">
                       {isCashAdvance 
                         ? (trx.status === 'Success' ? 'จ่ายแล้ว' : trx.status === 'Rejected' ? 'ปฏิเสธ' : 'รอจ่ายคืน')
                         : (t(`rubber.wallet.statuses.${trx.status?.toLowerCase()}`) || trx.status)
                       }
                    </Badge>
                  </div>
                </div>
              );
              })}
            </div>
          </section>

          <Card className="p-6 bg-slate-900 text-white border-none shadow-2xl rounded-[2.5rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <h3 className="text-xs font-black text-primary mb-2 uppercase tracking-widest">{t("rubber.wallet.commissionRate")}</h3>
              <p className="text-[11px] text-white/50 leading-relaxed font-bold uppercase tracking-tight">{t("rubber.wallet.commissionDesc")}</p>
          </Card>
        </div>

        <Modal 
          isOpen={isModalOpen} 
          onClose={closeModal} 
          title={isSuccess ? t("rubber.wallet.withdrawSuccess") : t("rubber.wallet.withdrawAmount")}
        >
          {!isSuccess ? (
            <div className="w-full space-y-8 h-full flex flex-col items-center">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setAmount(val);
                    }}
                    className="w-full bg-slate-50 rounded-xl px-8 py-6 text-3xl font-black text-center text-slate-900 outline-none focus:ring-4 focus:ring-primary/20 transition-all border-none"
                    placeholder="0.00"
                  />
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300 pointer-events-none">฿</span>
                </div>

                <div className="w-full grid grid-cols-1 gap-3">
                   <GlobalInput 
                     placeholder={t("rubber.wallet.bankNamePlaceholder")} 
                     value={bankName}
                     onChange={(e) => setBankName(e.target.value)}
                   />
                   <GlobalInput 
                     placeholder={t("rubber.wallet.accountNumberPlaceholder")} 
                     value={accountNumber}
                     onChange={(e) => setAccountNumber(e.target.value)}
                   />
                   <GlobalInput 
                     placeholder={t("rubber.wallet.accountNamePlaceholder")} 
                     value={accountName}
                     onChange={(e) => setAccountName(e.target.value)}
                   />
                </div>
               
               <div className="w-full space-y-4">
                  <div className="flex justify-between items-center px-4">
                     <p className="text-[10px] font-black text-slate-400 uppercase">{t("rubber.wallet.withdrawMin")}</p>
                     <p className="text-[10px] font-black text-primary uppercase cursor-pointer" onClick={() => setAmount(Math.floor(balance).toString())}>Max: ฿{Math.floor(balance)}</p>
                  </div>
                  
                  <Button 
                     onClick={handleWithdraw}
                     disabled={!amount || parseInt(amount) < 300 || parseInt(amount) > balance || isProcessing}
                     className="w-full py-5 bg-primary text-white rounded-xl font-black uppercase shadow-2xl shadow-primary/30"
                  >
                     {isProcessing ? t("rubber.wallet.processing") : t("rubber.wallet.confirmWithdraw")}
                  </Button>
                  <button 
                    onClick={closeModal}
                    className="w-full py-4 text-slate-400 text-xs font-black uppercase"
                  >
                    {t("common.cancel")}
                  </button>
               </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center animate-page-enter">
               <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10 scale-110">
                  <Icons.CheckCircle size={40} />
               </div>
               <p className="text-sm text-slate-500 font-bold leading-relaxed mb-10 max-w-[240px]">
                  {t("rubber.wallet.withdrawSuccessDesc")}
               </p>
               <Button 
                 onClick={closeModal}
                 className="w-full py-5 bg-slate-900 text-white rounded-xl font-black uppercase"
               >
                  {t("common.confirm")}
               </Button>
            </div>
          )}
        </Modal>

        <ConfirmModal 
          isOpen={alertConfig.isOpen}
          onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
        />
      </div>
    </PinLock>
   );
}
