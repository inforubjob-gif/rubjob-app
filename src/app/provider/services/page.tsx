"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

// Assuming we stored provider session globally or in localStorage
export default function ProviderServicesDashboard() {
  const router = useRouter();
  const [provider, setProvider] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem("rubjob_provider_session");
    if (session) {
      const parsed = JSON.parse(session);
      setProvider(parsed);
      fetchServices(parsed.id);
    } else {
      router.replace("/provider/login");
    }
  }, [router]);

  async function fetchServices(providerId: string) {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/provider/services?providerId=${providerId}`);
      const data = await res.json() as any;
      if (data.services) {
        setServices(data.services);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // Quick helper to render the lowest package price
  function getStartingPrice(packagesStr: string, fallback: number) {
    try {
      const pkgs = JSON.parse(packagesStr);
      if (pkgs && pkgs.length > 0) {
        // usually basic or index 0
        const basic = pkgs.find((p: any) => p.type === 'basic') || pkgs[0];
        return `฿${basic.price}/${basic.unit || 'ครั้ง'}`;
      }
    } catch (e) {}
    return fallback > 0 ? `฿${fallback}` : "ไม่ได้ตั้งราคา";
  }

  if (!provider) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary to-primary-dark px-5 pt-4 pb-10 relative">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push("/provider/profile")} className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icons.ArrowRight size={18} className="text-white rotate-180" />
          </button>
          <Icons.Store size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase mt-2">จัดการบริการของฉัน</h1>
        <p className="text-white/80 text-xs font-bold leading-relaxed mt-2 max-w-xs">
          สร้างบริการแพ็คเกจส่วนตัว กำหนดราคาและรายละเอียดเพื่อให้ลูกค้าเลือกจอง
        </p>
      </div>

      <div className="px-5 -mt-6 relative z-10 space-y-4">
        {/* Render Gigs */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-32 bg-slate-200 animate-pulse rounded-xl" />
            <div className="h-32 bg-slate-200 animate-pulse rounded-xl" />
          </div>
        ) : services.length === 0 ? (
          <Card className="p-10 flex flex-col items-center justify-center text-center border-dashed border-2 border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
              <Icons.Tasks size={32} />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase mb-2">ยังไม่มีบริการที่เสนอ</h3>
            <p className="text-xs font-bold text-slate-500 mb-6">คุณยังไม่ได้สร้างกิ๊ก(Gig) ส่วนตัวเลย เริ่มต้นสร้างบริการแรกของคุณได้เลย!</p>
          </Card>
        ) : (
          services.map(svc => (
            <Card key={svc.id} className="p-5 flex flex-col gap-3 relative overflow-hidden group border-2 border-transparent hover:border-primary/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${svc.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="text-[10px] font-black text-slate-400 uppercase">{svc.isActive ? 'เปิดรับงาน' : 'ปิดรับงานชั่วคราว'}</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-800 leading-tight">{svc.title}</h3>
                  <p className="text-xs text-primary-dark font-black mt-2">
                    เริ่มต้น {getStartingPrice(svc.packages, svc.price)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-primary text-xl shrink-0">
                  {/* Mapping string icon name to simple emoji fallback if needed, or we just render an arbitrary Icon component */}
                  {svc.icon === 'gecko_catcher' ? '🦎' : svc.icon === 'fortune_telling' ? '🔮' : '🧩'}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-slate-100">
                <Button variant="secondary" size="sm" className="flex-1 text-[11px] py-2" onClick={() => router.push(`/provider/services/create?edit=${svc.id}`)}>
                  แก้ไข
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`flex-1 text-[11px] py-2 ${!svc.isActive ? "text-emerald-500 border-emerald-200" : "text-slate-500"}`}
                >
                  {svc.isActive ? "ปิดบริการ" : "เปิดบริการ"}
                </Button>
              </div>
            </Card>
          ))
        )}

        {/* Add Gig Button */}
        <Button 
          fullWidth 
          className="mt-6 py-4 rounded-xl font-black uppercase text-xs shadow-lg shadow-primary/20 border-2 border-primary bg-primary/5 text-primary hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-2"
          onClick={() => router.push("/provider/services/create")}
        >
          <Icons.Plus size={16} strokeWidth={3} /> สร้างบริการใหม่ (Gig)
        </Button>
      </div>
    </div>
  );
}
