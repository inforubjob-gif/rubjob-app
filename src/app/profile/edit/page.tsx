"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/providers/LiffProvider";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";

export default function EditProfilePage() {
  const router = useRouter();
  const { profile, isReady } = useLiff();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile?.displayName) setName(profile.displayName);
    if (profile?.pictureUrl) setPhotoUrl(profile.pictureUrl);
    if (profile?.email) setEmail(profile.email);
  }, [profile]);

  const handleVerify = () => {
    if (phone.length < 9) return;
    setIsVerifying(true);
  };

  const confirmOtp = () => {
    // LINE-based users skip OTP — phone is verified through LINE profile
    // For non-LINE flows, accept any 4-digit code as placeholder until SMS provider is integrated
    if (otp.length === 4) {
      setIsVerified(true);
      setIsVerifying(false);
    } else {
      alert(t("profile.invalidOtp"));
    }
  };

  const handleSave = async () => {
    if (!isVerified) {
      alert(t("profile.verifyPhoneFirst"));
      return;
    }
    setIsLoading(true);
    try {
      await fetch("/api/user/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profile?.userId,
          displayName: name,
          pictureUrl: photoUrl,
          phone,
        }),
      });
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsLoading(false);
    }
    router.back();
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden text-slate-900">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-primary via-primary to-slate-50 z-0" />

      {/* Header */}
      <header className="relative z-10 px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <Icons.Back size={20} />
        </button>
        <h1 className="text-lg font-black text-white">{t("profile.editTitle")}</h1>
      </header>

      <main className="relative z-10 p-5 space-y-8 animate-fade-in">
        {/* Profile Image Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
            <div className="w-28 h-28 rounded-xl bg-white p-1.5 shadow-2xl relative overflow-hidden transition-transform active:scale-95 ring-4 ring-white/30">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-400 rounded-xl">
                  <span className="text-3xl font-black uppercase">{name?.[0] || "U"}</span>
                </div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <Icons.Camera size={24} className="text-white" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-xl border-[4px] border-slate-50">
              <Icons.Edit size={18} />
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
            />
          </div>
          <p className="text-[11px] font-[900] text-slate-500 uppercase opacity-60">{t("profile.tapToChangePhoto")}</p>
        </div>

        <section className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase ml-2 block">{t("profile.fullName")}</label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white rounded-xl pl-14 pr-6 py-5 font-extrabold text-slate-900 shadow-xl shadow-slate-200/40 outline-none focus:ring-4 focus:ring-primary/20 transition-all border-none"
                placeholder={t("profile.fullName")}
              />
              <div className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                <Icons.User size={18} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase ml-2 block">{t("profile.email")}</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white rounded-xl pl-14 pr-6 py-5 font-extrabold text-slate-900 shadow-xl shadow-slate-200/40 outline-none focus:ring-4 focus:ring-primary/20 transition-all border-none"
                placeholder="example@mail.com"
              />
              <div className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                <Icons.Mail size={18} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase ml-2 block">{t("profile.phoneNumber")}</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 10) setPhone(val);
                  }}
                  disabled={isVerified}
                  className={`w-full bg-white rounded-xl pl-14 pr-6 py-5 font-extrabold text-slate-900 shadow-xl shadow-slate-200/40 outline-none transition-all border-none ${isVerified ? 'bg-slate-50 text-slate-400' : 'focus:ring-4 focus:ring-primary/20'}`}
                  placeholder="08X-XXX-XXXX"
                />
                <div className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                  <Icons.Phone size={18} className={isVerified ? 'text-emerald-500' : 'text-slate-400'} />
                </div>
                {isVerified && (
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 bg-emerald-50 p-1 rounded-full">
                    <Icons.Guarantee size={16} />
                  </div>
                )}
              </div>
              
              {!isVerified && (
                <button
                  onClick={handleVerify}
                  disabled={phone.length < 9}
                  className="px-6 bg-slate-900 text-white rounded-xl font-black text-xs uppercase disabled:opacity-20 disabled:grayscale transition-all shadow-xl active:scale-95"
                >
                  {t("profile.verify")}
                </button>
              )}
            </div>
            {isVerified && (
              <p className="text-[10px] font-black text-emerald-600 uppercase ml-4 mt-3 flex items-center gap-1.5 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100">
                 <span className="w-1 h-1 bg-emerald-500 rounded-full" /> {t("profile.verified")}
              </p>
            )}
          </div>
        </section>

        <div className="pt-6">
          <button
            onClick={handleSave}
            disabled={!isVerified || isLoading}
            className="w-full py-5 bg-primary text-white rounded-xl font-[1000] uppercase transition-all flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-4 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
            ) : (
              t("profile.saveProfile")
            )}
          </button>
        </div>
      </main>

      {/* OTP MODAL */}
      {isVerifying && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
          <Card className="w-full max-w-sm bg-white p-8 relative z-10 flex flex-col items-center text-center shadow-2xl animate-scale-in">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
              <Icons.Lock size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">{t("profile.otpTitle")}</h3>
            <p className="text-sm text-slate-400 font-medium mb-8">
              {t("profile.otpDesc")} <br />
              <span className="text-slate-900 font-bold">{phone}</span>
            </p>

            <div className="flex gap-3 mb-8">
              <input
                type="text"
                autoFocus
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-slate-100 rounded-xl px-4 py-5 text-3xl font-black text-center text-slate-900 outline-none focus:ring-4 focus:ring-primary/20 transition-all"
                placeholder="0000"
              />
            </div>

            <div className="flex flex-col w-full gap-3">
              <button 
                onClick={confirmOtp}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase active:scale-95 transition-all shadow-xl"
              >
                {t("common.confirm")}
              </button>
              <button 
                onClick={() => setIsVerifying(false)}
                className="w-full py-4 text-slate-400 text-xs font-bold uppercase hover:text-slate-600 transition-colors"
              >
                {t("common.cancel")}
              </button>
            </div>
            
            <p className="mt-8 text-[10px] text-slate-300 font-bold uppercase">
              {t("profile.otpHint") || "กรอกรหัส 4 หลักที่ได้รับ"}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
