"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useLiff } from "@/components/providers/LiffProvider";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 text-sm font-bold">Loading Map...</div>,
});

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { profile } = useLiff();
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Phone
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Step 2: Address
  const [addressLabel, setAddressLabel] = useState("");
  const [addressDetails, setAddressDetails] = useState("");
  const [addressNote, setAddressNote] = useState("");
  const [pinLat, setPinLat] = useState<number | null>(null);
  const [pinLng, setPinLng] = useState<number | null>(null);
  const [pinSet, setPinSet] = useState(false);

  // Format phone as 08X-XXX-XXXX
  function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function validatePhone(val: string): boolean {
    const digits = val.replace(/\D/g, "");
    return /^0[689]\d{8}$/.test(digits);
  }

  async function handlePhoneSubmit() {
    if (!validatePhone(phone)) {
      setPhoneError("กรุณากรอกเบอร์โทรให้ถูกต้อง (เช่น 081-234-5678)");
      return;
    }
    setPhoneError("");
    setIsSubmitting(true);

    try {
      const cleanPhone = phone.replace(/\D/g, "");
      await fetch("/api/user/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profile?.userId,
          displayName: profile?.displayName,
          pictureUrl: profile?.pictureUrl,
          phone: cleanPhone,
        }),
      });
      setStep(2);
    } catch (err) {
      console.error("Failed to save phone:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePinLocation(lat: number, lng: number) {
    setPinLat(parseFloat(lat.toFixed(6)));
    setPinLng(parseFloat(lng.toFixed(6)));
    setPinSet(true);
  }

  async function handleAddressSubmit() {
    if (!addressLabel.trim() || !addressDetails.trim()) return;
    setIsSubmitting(true);

    try {
      await fetch("/api/user/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile?.userId,
          label: addressLabel.trim(),
          details: addressDetails.trim(),
          note: addressNote.trim() || null,
          lat: pinLat,
          lng: pinLng,
          isDefault: true,
        }),
      });
      // Set completion flag to skip onboarding on refresh
      localStorage.setItem("rubjob_onboarding_done", "true");
      onComplete();
    } catch (err) {
      console.error("Failed to save address:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-white relative overflow-hidden">
      {/* Gradient Header */}
      <div className="relative bg-gradient-to-br from-[#F3B34E] via-[#F5C16E] to-[#F3B34E] px-6 pt-14 pb-10 text-center overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-10 w-32 h-32 bg-white/10 rounded-full" />

        <div className="relative z-10">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/20 ring-4 ring-white/30 overflow-hidden">
            <Icons.Logo size={80} variant="icon" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            {step === 1 ? "ยินดีต้อนรับ! 🎉" : "เพิ่มที่อยู่ของคุณ"}
          </h1>
          <p className="text-sm text-white/80 mt-1 font-medium">
            {step === 1
              ? "กรุณากรอกเบอร์โทรเพื่อเริ่มใช้งาน"
              : "เพิ่มที่อยู่สำหรับเข้ารับ-ส่งผ้า"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-3 justify-center mt-6 relative z-10">
          <div className={`h-1.5 w-16 rounded-full transition-all duration-500 ${step >= 1 ? "bg-white" : "bg-white/30"}`} />
          <div className={`h-1.5 w-16 rounded-full transition-all duration-500 ${step >= 2 ? "bg-white" : "bg-white/30"}`} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-5 py-6 -mt-4 relative z-10">
        {/* ─── Step 1: Phone ─── */}
        {step === 1 && (
          <div className="animate-fade-in space-y-5">
            <Card className="p-6 shadow-xl shadow-slate-200/50 border-slate-100 ring-1 ring-slate-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 bg-primary-light rounded-2xl flex items-center justify-center text-primary-dark shadow-sm">
                  <Icons.Phone size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">เบอร์โทรศัพท์</h3>
                  <p className="text-xs text-muted mt-0.5">ใช้สำหรับติดต่อเรื่องออเดอร์</p>
                </div>
              </div>

              <div className="relative">
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatPhone(e.target.value));
                    setPhoneError("");
                  }}
                  placeholder="08X-XXX-XXXX"
                  className={`w-full bg-slate-50 border-2 rounded-2xl px-5 py-4 text-lg font-bold text-center tracking-widest focus:outline-none focus:ring-4 transition-all duration-300 ${
                    phoneError
                      ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                      : "border-slate-100 focus:ring-primary/20 focus:border-primary"
                  }`}
                />
              </div>
              {phoneError && (
                <p className="text-xs text-red-500 font-bold mt-2 text-center animate-fade-in">
                  {phoneError}
                </p>
              )}

              <p className="text-[11px] text-muted text-center mt-3 opacity-70">
                เราจะไม่แชร์เบอร์โทรของคุณกับบุคคลอื่น
              </p>
            </Card>

            <Button
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              disabled={phone.replace(/\D/g, "").length < 10}
              onClick={handlePhoneSubmit}
            >
              ถัดไป →
            </Button>
          </div>
        )}

        {/* ─── Step 2: Address ─── */}
        {step === 2 && (
          <div className="animate-fade-in space-y-5">
            <Card className="p-6 shadow-xl shadow-slate-200/50 border-slate-100 ring-1 ring-slate-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 bg-primary-light rounded-2xl flex items-center justify-center text-primary-dark shadow-sm">
                  <Icons.MapPin size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">ที่อยู่สำหรับรับ-ส่งผ้า</h3>
                  <p className="text-xs text-muted mt-0.5">เพิ่มที่อยู่แรกของคุณ</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Address label */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">ชื่อที่อยู่</label>
                  <div className="flex gap-2 mb-2">
                    {["🏠 บ้าน", "🏢 ออฟฟิศ", "🏨 คอนโด"].map((preset) => {
                      const label = preset.slice(2).trim();
                      return (
                        <button
                          key={label}
                          onClick={() => setAddressLabel(label)}
                          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-300 border-2 ${
                            addressLabel === label
                              ? "border-primary bg-primary/5 text-primary-dark shadow-sm"
                              : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={addressLabel}
                    onChange={(e) => setAddressLabel(e.target.value)}
                    placeholder="หรือพิมพ์ชื่อเอง..."
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* Address details */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">รายละเอียดที่อยู่</label>
                  <textarea
                    value={addressDetails}
                    onChange={(e) => setAddressDetails(e.target.value)}
                    placeholder="เช่น 123/4 ซ.สุขุมวิท 55 แขวงคลองตัน..."
                    rows={3}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  />
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">หมายเหตุ (ไม่จำเป็น)</label>
                  <input
                    type="text"
                    value={addressNote}
                    onChange={(e) => setAddressNote(e.target.value)}
                    placeholder='เช่น "ตึก A ชั้น 5 ห้อง 502"'
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* Pin location with real map */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">ปักหมุดตำแหน่ง</label>
                  <div className="h-52 w-full rounded-xl overflow-hidden border-2 border-slate-100">
                    <MapPicker
                      lat={pinLat || 0}
                      lng={pinLng || 0}
                      onChange={handlePinLocation}
                    />
                  </div>
                  <p className={`text-xs font-bold ${pinSet ? "text-emerald-600" : "text-slate-400"}`}>
                    {pinSet ? `📍 ปักหมุดแล้ว (${pinLat}, ${pinLng})` : "แตะแผนที่เพื่อปักหมุดตำแหน่ง"}
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 active:scale-95 transition-transform shrink-0"
              >
                <Icons.Back size={20} />
              </button>
              <Button
                fullWidth
                size="lg"
                isLoading={isSubmitting}
                disabled={!addressLabel.trim() || !addressDetails.trim()}
                onClick={handleAddressSubmit}
              >
                เริ่มใช้งาน RUBJOB 🚀
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
