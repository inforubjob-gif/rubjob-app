"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useLiff } from "@/components/providers/LiffProvider";

export default function HelpPage() {
  const router = useRouter();
  const { profile } = useLiff();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !content || !profile?.userId) return;

    setIsSubmitting(true);
    try {
      // 1. Create In-app ticket (We manually call a webhook-like behavior for in-app)
      // For simplicity, we can use a direct support API that handles ticket creation
      // We'll use the Webhook logic internally
      const res = await fetch("/api/webhook/line/inapp", { // We'll repurpose the logic or create a specific one
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: [{
            type: "message",
            message: { type: "text", text: `[${subject}] ${content}` },
            source: { userId: profile.userId }
          }],
          manual_source: "in_app" // Signal to the webhook that this is in-app
        })
      });

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => router.back(), 2000);
      }
    } catch (err) {
      console.error("Failed to open ticket:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <Icons.Phone size={40} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">ส่งเรื่องเรียบร้อย! ✨</h1>
        <p className="text-slate-500 font-medium">เจ้าหน้าที่จะเร่งดำเนินการตรวจสอบ และแจ้งกลับคุณโดยเร็วที่สุดครับ</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#F3B34E] via-[#F5C16E] to-[#F3B34E] px-6 pt-14 pb-12 relative overflow-hidden">
        <button 
          onClick={() => router.back()}
          className="absolute top-12 left-5 w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white"
        >
          <Icons.Back size={20} />
        </button>
        <div className="text-center">
           <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-white/30">
             <Icons.Chat size={32} className="text-white" />
           </div>
           <h1 className="text-2xl font-black text-white tracking-tight">ศูนย์ช่วยเหลือ</h1>
           <p className="text-white/80 text-sm font-medium mt-1">แจ้งปัญหาหรือสอบถามข้อมูลกับ RUBJOB</p>
        </div>
      </div>

      <div className="px-5 -mt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6 border-slate-100 shadow-xl shadow-slate-200/50 rounded-[2rem]">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">หัวข้อที่ต้องการแจ้ง</label>
                <div className="grid grid-cols-2 gap-2">
                  {["แจ้งปัญหา", "สอบถาม", "การเงิน", "อื่นๆ"].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSubject(opt)}
                      className={`py-3 px-2 rounded-xl text-xs font-black transition-all border-2 ${subject === opt ? 'bg-primary/10 border-primary text-primary-dark' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">รายละเอียด</label>
                <textarea 
                  required
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="กรุณาระบุรายละเอียดปัญหาที่พบ..."
                  rows={5}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none"
                />
              </div>
            </div>
          </Card>

          <Button 
            fullWidth 
            size="lg"
            isLoading={isSubmitting}
            disabled={!subject || !content.trim()}
            type="submit"
          >
            ส่งเรื่องให้แอดมิน 🚀
          </Button>

          <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 flex gap-4">
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shrink-0 shadow-sm">
                <Icons.Chat size={24} />
             </div>
             <div>
                <p className="text-xs font-black text-indigo-900">ทักทาง LINE ได้รวดเร็วกว่า!</p>
                <p className="text-[10px] font-medium text-indigo-600 mt-0.5 leading-relaxed">หากต้องการคุยกับเจ้าหน้าที่แบบเร่งด่วน สามารถกดปุ่มทัก LINE OA ได้ทันทีครับ</p>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
}
