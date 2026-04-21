"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";

export default function ProviderWalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  async function fetchWallet() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/provider/wallet");
      const data = await res.json();
      setBalance(data.balance || 0);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Failed to fetch wallet:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < 100) {
      alert("ยอดถอนขั้นต่ำ 100 บาท");
      return;
    }
    try {
      const res = await fetch("/api/provider/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("ส่งคำขอถอนเงินแล้ว จะโอนภายใน 24 ชม.");
        setShowWithdraw(false);
        setWithdrawAmount("");
        fetchWallet();
      } else {
        alert(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-b from-violet-600 to-violet-500 px-5 pt-4 pb-10 relative">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push("/provider")} className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icons.ArrowRight size={18} className="text-white rotate-180" />
          </button>
          <h1 className="text-xl font-black text-white uppercase">กระเป๋าเงิน</h1>
        </div>

        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl">
          <p className="text-xs font-black text-white/50 uppercase mb-2">ยอดเงินคงเหลือ</p>
          <p className="text-4xl font-black text-white mb-4">฿{balance.toLocaleString()}</p>
          <Button
            onClick={() => setShowWithdraw(!showWithdraw)}
            className="bg-white text-violet-600 font-black uppercase text-xs py-3 px-6 rounded-xl shadow-lg active:scale-95 transition-all"
          >
            แจ้งถอนเงิน
          </Button>
        </Card>
      </div>

      {/* Withdraw Form */}
      {showWithdraw && (
        <div className="px-5 -mt-4 mb-4 animate-in fade-in slide-in-from-top-4">
          <Card className="p-6 border-2 border-violet-200">
            <p className="text-xs font-black text-slate-400 uppercase mb-3">จำนวนเงินที่ต้องการถอน</p>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-slate-50 rounded-xl px-4 py-4 text-2xl font-black text-center border-none focus:ring-2 focus:ring-violet-500/20 mb-4"
            />
            <p className="text-[10px] text-slate-400 font-bold text-center mb-4">ถอนขั้นต่ำ 100 บาท</p>
            <Button
              fullWidth
              onClick={handleWithdraw}
              className="bg-violet-600 text-white py-4 rounded-xl font-black uppercase shadow-xl active:scale-95 transition-all"
            >
              ยืนยันการถอนเงิน
            </Button>
          </Card>
        </div>
      )}

      {/* Commission Info */}
      <div className="px-5 mb-6">
        <Card className="bg-violet-50 border border-violet-100 p-4">
          <p className="text-xs font-bold text-violet-700">
            💡 อัตราค่าธรรมเนียมแพลตฟอร์ม 15% — คุณได้รับ 85% ของแต่ละงาน
          </p>
        </Card>
      </div>

      {/* Transaction History */}
      <div className="px-5 flex-1 pb-24">
        <h2 className="text-sm font-black text-slate-400 uppercase mb-4">ประวัติรายได้</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 h-16 animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
            <p className="text-xs font-black text-slate-300 uppercase">ยังไม่มีรายการ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx, i) => (
              <Card key={i} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.type === "job_completion" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                  }`}>
                    {tx.type === "job_completion" ? <Icons.ArrowRight size={18} className="rotate-[-45deg]" /> : <Icons.ArrowRight size={18} className="rotate-[135deg]" />}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase">
                      {tx.type === "job_completion" ? "เสร็จสิ้นงาน" : "ถอนเงิน"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold">
                      {new Date(tx.createdAt).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                </div>
                <p className={`text-sm font-black ${tx.type === "job_completion" ? "text-emerald-600" : "text-rose-600"}`}>
                  {tx.type === "job_completion" ? "+" : "-"}฿{tx.amount?.toLocaleString()}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-lg">
        <div className="flex items-center justify-around py-3 max-w-md mx-auto">
          <button onClick={() => router.push("/provider")} className="flex flex-col items-center gap-1 text-slate-400 hover:text-violet-600 transition-colors">
            <Icons.Home size={20} />
            <span className="text-[10px] font-black uppercase">งาน</span>
          </button>
          <button onClick={() => router.push("/provider/wallet")} className="flex flex-col items-center gap-1 text-violet-600">
            <Icons.CreditCard size={20} />
            <span className="text-[10px] font-black uppercase">รายได้</span>
          </button>
          <button onClick={() => router.push("/provider/profile")} className="flex flex-col items-center gap-1 text-slate-400 hover:text-violet-600 transition-colors">
            <Icons.User size={20} />
            <span className="text-[10px] font-black uppercase">โปรไฟล์</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
