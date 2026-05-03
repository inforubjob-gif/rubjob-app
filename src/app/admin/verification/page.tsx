"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/components/providers/LanguageProvider";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import { useToast } from "@/components/providers/ToastProvider";
import Button from "@/components/ui/Button";

export default function VerificationCenterPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [docs, setDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  useEffect(() => {
    fetchPendingDocs();
  }, []);

  async function fetchPendingDocs() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/verification");
      const data = await res.json() as any;
      if (data.documents) setDocs(data.documents);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateDocStatus(id: string, status: string, notes?: string) {
    try {
      const res = await fetch("/api/admin/verification", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, notes }),
      });
      if (res.ok) {
        showToast(`Document ${status}`, "success");
        setDocs(prev => prev.filter(d => d.id !== id));
        setSelectedDoc(null);
      }
    } catch (err) {
      showToast("Operation failed", "error");
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">ศูนย์อนุมัติเอกสาร (Verification Center)</h1>
        <p className="text-slate-500 text-sm md:text-base font-medium mt-1">ตรวจสอบเอกสารยืนยันตัวตนของพาร์ทเนอร์ทั้งหมด</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* List of Pending Docs */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">รายการที่รอการตรวจสอบ ({docs.length})</h2>
          {isLoading ? (
            <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
          ) : docs.length === 0 ? (
            <Card className="p-10 text-center text-slate-400 font-bold text-sm">ไม่มีรายการค้างตรวจสอบ ✨</Card>
          ) : (
            docs.map(doc => (
              <button 
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${selectedDoc?.id === doc.id ? 'bg-primary/5 border-primary shadow-lg scale-[1.02]' : 'bg-white border-slate-100 hover:border-slate-200'}`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${doc.partnerType === 'rider' ? 'bg-blue-50 text-blue-500' : 'bg-violet-50 text-violet-500'}`}>
                  {doc.partnerType === 'rider' ? <Icons.Bike size={24} /> : <Icons.User size={24} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 truncate">{doc.partnerName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-black uppercase text-slate-400">{doc.type}</span>
                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-bold text-slate-400">{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Document Viewer */}
        <div className="lg:col-span-8">
          {selectedDoc ? (
            <Card className="p-0 overflow-hidden border border-slate-200 shadow-2xl sticky top-8">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                      {selectedDoc.partnerPicture ? <img src={selectedDoc.partnerPicture} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full"><Icons.User size={20} /></div>}
                   </div>
                   <div>
                      <h3 className="font-black text-slate-900 leading-none">{selectedDoc.partnerName}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">{selectedDoc.partnerType} • {selectedDoc.type}</p>
                   </div>
                </div>
                <div className="flex gap-2">
                   <Button variant={"success" as any} size="sm" onClick={() => updateDocStatus(selectedDoc.id, 'verified')}>Approve</Button>
                   <Button variant={"danger" as any} size="sm" onClick={() => updateDocStatus(selectedDoc.id, 'rejected')}>Reject</Button>
                </div>
              </div>

              <div className="p-2 bg-slate-900 aspect-[4/3] relative flex items-center justify-center group">
                 {selectedDoc.url ? (
                   <img src={selectedDoc.url} alt="Document" className="max-w-full max-h-full object-contain" />
                 ) : (
                   <div className="text-white/20 font-black text-2xl uppercase italic">No Image Preview</div>
                 )}
                 <a 
                   href={selectedDoc.url} 
                   target="_blank" 
                   className="absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100"
                 >
                   Open Full Screen
                 </a>
              </div>

              <div className="p-8 space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Admin Review Note</label>
                    <textarea 
                      placeholder="เหตุผลประกอบการพิจารณา (เช่น รูปภาพไม่ชัดเจน, ข้อมูลไม่ตรง)..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-sm font-medium focus:border-primary outline-none transition-all"
                      rows={3}
                    />
                 </div>
                 <div className="pt-6 border-t border-slate-50 grid grid-cols-2 gap-8">
                    <div>
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Uploaded On</p>
                       <p className="text-sm font-bold text-slate-700">{new Date(selectedDoc.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Partner Email</p>
                       <p className="text-sm font-bold text-slate-700">{selectedDoc.partnerEmail}</p>
                    </div>
                 </div>
              </div>
            </Card>
          ) : (
            <div className="h-[600px] flex flex-col items-center justify-center bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-300">
               <Icons.Shield size={64} strokeWidth={1} className="mb-4 opacity-20" />
               <p className="font-black uppercase tracking-widest text-xs">เลือกเอกสารที่ต้องการตรวจสอบ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
