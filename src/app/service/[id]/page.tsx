"use client";

export const runtime = 'edge';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons, getServiceIcon } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function GigLandingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [gig, setGig] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchGig() {
      try {
        const res = await fetch("/api/services");
        const data = await res.json();
        if (data.services) {
          const found = data.services.find((s: any) => s.id === params.id);
          if (found) {
            setGig(found);
            try {
              if (found.packages) {
                setPackages(JSON.parse(found.packages));
              }
            } catch (e) {}
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchGig();
  }, [params.id]);

  const handleBookPackage = (pkg: any) => {
    // Route to booking page with specific gig and package instructions
    // To encode package data so booking engine knows the price & name
    // A better way is just passing packageType and fetching from DB in booking,
    // Or for stateless UX just pass in query
    const pkgData = btoa(encodeURIComponent(JSON.stringify({
      type: pkg.type,
      name: pkg.name,
      price: pkg.price,
      unit: pkg.unit
    })));
    router.push(`/booking?service=${gig.id}&pkgData=${pkgData}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center">
        <Icons.Loading size={40} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center px-5 text-center">
        <Icons.Alert size={48} className="text-slate-300 mb-4" />
        <h1 className="text-xl font-black text-slate-800">ไม่พบบริการนี้</h1>
        <p className="text-sm font-medium text-slate-500 mt-2">บริการนี้อาจถูกลบหรือปิดรับงานชั่วคราว</p>
        <Button onClick={() => router.push("/")} className="mt-8 rounded-xl">กลับหน้าแรก</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-10">
      {/* Dynamic Header Image / Icon Cover */}
      <div className="relative h-[250px] bg-gradient-to-br from-primary via-primary-dark to-slate-900 w-full overflow-hidden flex items-center justify-center">
        <div className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer" onClick={() => router.back()}>
          <Icons.ArrowRight size={20} className="text-white rotate-180" />
        </div>
        
        {/* Placeholder Cover Abstract */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
        
        <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white/90 shadow-xl border border-white/20 transform rotate-3">
          {getServiceIcon(gig.icon, { size: 48, className: "transform -rotate-3" })}
        </div>
      </div>

      <div className="px-5 -mt-8 relative z-10">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-primary/10 text-primary-dark px-2 py-1 rounded-md text-[10px] font-black uppercase">
              {gig.category || "FREELANCE GIG"}
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-800 leading-tight mb-4">
            {gig.name}
          </h1>
          
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100 italic">
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-slate-50">
              {gig.providerPicture ? (
                <img src={gig.providerPicture} alt="" className="w-full h-full object-cover" />
              ) : (
                <Icons.User size={20} className="text-slate-500" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Expert Partner</p>
              <p className="text-sm font-black text-slate-800">{gig.providerName}</p>
            </div>
            {gig.providerLineId && (
              <a 
                href={`https://line.me/ti/p/~${gig.providerLineId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-100 hover:bg-emerald-100 transition-all shadow-sm"
              >
                <Icons.Line size={14} /> Contact
              </a>
            )}
            {!gig.providerLineId && (
              <div className="ml-auto flex items-center text-xs font-bold text-slate-400 gap-1 bg-slate-100 px-2 py-1 rounded-full">
                <Icons.Stars size={12} className="text-amber-400" /> 5.0
              </div>
            )}
          </div>
        </Card>

        {/* Description */}
        <section className="mt-5">
          <h2 className="text-sm font-black text-slate-800 uppercase mb-3 px-1">รายละเอียดงาน</h2>
          <Card className="p-5">
            <p className="text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
              {gig.description || "ผู้ให้บริการไม่ได้ระบุรายละเอียดเพิ่มเติม"}
            </p>
          </Card>
        </section>

        {/* Packages */}
        <section className="mt-6">
          <h2 className="text-sm font-black text-slate-800 uppercase mb-3 px-1">เลือกแพ็คเกจราคา</h2>
          <div className="flex flex-col gap-4">
            {packages.map((pkg: any) => (
              <Card key={pkg.type} className={`p-0 overflow-hidden border-2 transition-all hover:shadow-lg ${
                pkg.type === 'premium' ? 'border-violet-500 shadow-violet-500/20' : 
                pkg.type === 'standard' ? 'border-amber-400 shadow-amber-400/20' : 'border-primary shadow-primary/20'
              }`}>
                <div className={`px-5 py-3 flex items-center justify-between ${
                  pkg.type === 'premium' ? 'bg-violet-500' : 
                  pkg.type === 'standard' ? 'bg-amber-400' : 'bg-primary'
                }`}>
                  <h3 className="text-xs font-black text-white uppercase">{pkg.name}</h3>
                  <p className="text-sm font-black text-white">฿{pkg.price}</p>
                </div>
                
                <div className="p-5">
                  <p className="text-xs font-bold text-slate-600 mb-4">{pkg.description || "เป็นบริการมาตรฐานสำหรับผู้เริ่มต้น"}</p>
                  
                  <div className="grid grid-cols-2 gap-y-3 mb-5 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Icons.Clock size={16} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500">{pkg.deliveryDays} วันส่งมอบ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icons.Refresh size={16} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500">{pkg.revisions == 99 ? 'แก้ไขไม่จำกัด' : pkg.revisions == 0 ? 'ไม่ให้แก้ไข' : `แก้ไข ${pkg.revisions} ครั้ง`}</span>
                    </div>
                  </div>

                  <Button 
                    fullWidth 
                    className={`rounded-xl py-4 flex items-center justify-center gap-2 ${
                      pkg.type === 'premium' ? 'bg-violet-500 hover:bg-violet-600' : 
                      pkg.type === 'standard' ? 'bg-amber-400 text-amber-950 hover:bg-amber-500' : 'bg-primary hover:bg-primary-dark'
                    }`}
                    onClick={() => handleBookPackage(pkg)}
                  >
                    จองแพ็คเกจนี้ (฿{pkg.price}) <Icons.ArrowRight size={16} className="text-current" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
