"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useStoreAuth } from "@/components/providers/StoreProvider";

export default function StoreWalletPage() {
  const { t } = useTranslation();
  const { store } = useStoreAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!store?.id) return;
    fetchWalletData();
  }, [store?.id]);

  const fetchWalletData = async () => {
    try {
      const res = await fetch(`/api/store/wallet?storeId=${store?.id}`);
      const data = await res.json();
      if (data.balance !== undefined) setBalance(data.balance);
      if (data.transactions) setTransactions(data.transactions);
    } catch (err) {
      console.error("Fetch wallet error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || !bankName || !accountNumber) {
      alert(t("store.wallet.alertBankInfo"));
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch("/api/store/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store?.id,
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
        const data = await res.json();
        alert(data.error || t("store.wallet.withdrawError"));
      }
    } catch (err) {
      console.error("Withdrawal error:", err);
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
    <div className="flex flex-col min-h-dvh bg-slate-50">
      <header className="bg-primary text-white px-5 pt-12 pb-10 rounded-b-2xl shadow-xl relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="relative z-10">
          <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-2">{t("staff.wallet.availableBalance")}</p>
          <div className="flex items-baseline justify-center gap-2 mb-8 text-white">
            <span className="text-5xl font-black tracking-tight drop-shadow-md">฿{Math.floor(balance).toLocaleString()}</span>
            <span className="text-lg font-bold opacity-50">.{(balance % 1).toFixed(2).split('.')[1]}</span>
          </div>
          <div className="flex gap-3 max-w-xs mx-auto">
             <Button 
               onClick={() => setIsModalOpen(true)}
               className="flex-1 bg-white/20 backdrop-blur-lg text-white border border-white/40 shadow-xl py-4 font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
             >
                <Icons.Payment size={18} className="mr-2" /> {t("staff.wallet.withdraw")}
             </Button>
             <button className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 active:scale-95 transition-transform shadow-lg">
                <Icons.Clock size={20} className="text-white" />
             </button>
          </div>
        </div>
      </header>

      <div className="flex-1 px-5 py-8 space-y-6 pb-24 animate-fade-in">
        <section>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1">{t("staff.wallet.history")}</h2>
          <div className="space-y-3">
            {transactions.map((trx) => (
              <div key={trx.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${trx.amount > 0 ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
                  {trx.amount > 0 ? <Icons.Payment size={20} /> : <Icons.Clock size={20} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{trx.type}</p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase">{trx.date}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${trx.amount > 0 ? 'text-green-600' : 'text-slate-900'}`}>
                    {trx.amount > 0 ? `+฿${trx.amount}` : `-฿${Math.abs(trx.amount)}`}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">{trx.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Card className="p-6 bg-orange-50 border-2 border-orange-100 shadow-sm">
            <h3 className="text-sm font-black text-primary mb-2 uppercase tracking-tight">{t("store.wallet.commissionRate")}</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4 font-bold">{t("store.wallet.commissionDesc")}</p>
            <div className="h-1.5 bg-white rounded-full overflow-hidden border border-orange-100">
                <div className="h-full bg-primary w-[85%] shadow-[0_0_8px_rgba(255,159,28,0.5)]" />
            </div>
        </Card>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={isSuccess ? t("store.wallet.withdrawSuccess") : t("store.wallet.withdrawAmount")}
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
                 <input 
                   type="text" 
                   placeholder={t("rider.wallet.bankNamePlaceholder")} 
                   value={bankName}
                   onChange={(e) => setBankName(e.target.value)}
                   className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                 />
                 <input 
                   type="text" 
                   placeholder={t("rider.wallet.accountNumberPlaceholder")} 
                   value={accountNumber}
                   onChange={(e) => setAccountNumber(e.target.value)}
                   className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                 />
                 <input 
                   type="text" 
                   placeholder={t("rider.wallet.accountNamePlaceholder")} 
                   value={accountName}
                   onChange={(e) => setAccountName(e.target.value)}
                   className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                 />
              </div>
             
             <div className="w-full space-y-4">
                <div className="flex justify-between items-center px-4">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("store.wallet.withdrawMin")}</p>
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest cursor-pointer" onClick={() => setAmount(Math.floor(balance).toString())}>Max: ฿{Math.floor(balance)}</p>
                </div>
                
                <Button 
                   onClick={handleWithdraw}
                   disabled={!amount || parseInt(amount) < 100 || parseInt(amount) > balance || isProcessing}
                   className="w-full py-5 bg-primary text-white rounded-xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30"
                >
                   {isProcessing ? t("rider.wallet.processing") : t("staff.wallet.confirmWithdraw")}
                </Button>
                <button 
                  onClick={closeModal}
                  className="w-full py-4 text-slate-400 text-xs font-black uppercase tracking-widest"
                >
                  {t("common.cancel")}
                </button>
             </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center animate-fade-in">
             <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10 scale-110">
                <Icons.CheckCircle size={40} />
             </div>
             <p className="text-sm text-slate-500 font-bold leading-relaxed mb-10 max-w-[240px]">
                {t("staff.wallet.withdrawSuccessDesc")}
             </p>
             <Button 
               onClick={closeModal}
               className="w-full py-5 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest"
             >
                {t("common.confirm")}
             </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
