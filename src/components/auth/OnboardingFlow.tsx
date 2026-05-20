"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useLiff } from "@/components/providers/LiffProvider";
import dynamic from "next/dynamic";
import GlobalInput from "@/components/ui/GlobalInput";
import GlobalTextarea from "@/components/ui/GlobalTextarea";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import Modal from "@/components/ui/Modal";

const MapPicker = dynamic(() => import("@/components/ui/GoogleMapPicker"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400 text-sm font-bold">Loading Map...</div>,
});

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { profile } = useLiff();
  const { t, language } = useTranslation();
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Phone
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Step 2: Terms
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Step 3: Location permission popup
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Step 4: Address
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
      setPhoneError(t("onboarding.phoneError"));
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
      showToast(t("common.error"), "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleTermsAccept() {
    setStep(3);
    // Show location permission modal after a short delay
    setTimeout(() => setShowLocationModal(true), 300);
  }

  function handleLocationPermission() {
    setShowLocationModal(false);
    setIsLocating(true);
    // Request location permission — IMPORTANT: set lat/lng BEFORE setStep(4)
    // so MapPicker receives real coords on first mount (prevents Bangkok default flicker)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lng = parseFloat(pos.coords.longitude.toFixed(6));
          // Batch all state updates together so MapPicker mounts with real coords
          setPinLat(lat);
          setPinLng(lng);
          setPinSet(true);
          setIsLocating(false);
          setStep(4);
        },
        () => {
          // Permission denied or error — still proceed, MapPicker will use Bangkok default
          setIsLocating(false);
          setStep(4);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setIsLocating(false);
      setStep(4);
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
      // Set completion flag scoped to userId (prevents skip after account deletion + re-register)
      if (profile?.userId) {
        localStorage.setItem(`rubjob_onboarded_${profile.userId}`, "true");
      }
      onComplete();
    } catch (err) {
      console.error("Failed to save address:", err);
      showToast(t("common.error"), "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step title and subtitle
  const stepTitles: Record<number, string> = {
    1: t("onboarding.welcomeTitle"),
    2: language === 'th' ? "ข้อตกลงการใช้งาน" : "Terms of Service",
    3: language === 'th' ? "เปิดใช้งานโลเคชัน" : "Enable Location",
    4: t("onboarding.addressTitle"),
  };
  const stepSubtitles: Record<number, string> = {
    1: t("onboarding.phoneSubtitle"),
    2: language === 'th' ? "กรุณาอ่านและยอมรับข้อตกลงก่อนใช้งาน" : "Please read and accept before continuing",
    3: language === 'th' ? "เราต้องการตำแหน่งของคุณเพื่อค้นหาร้านซักใกล้บ้าน" : "We need your location to find nearby laundry shops",
    4: t("onboarding.addressSubtitle"),
  };

  return (
    <div className="flex flex-col min-h-dvh bg-white relative overflow-hidden">
      {/* Gradient Header */}
      <div className="relative bg-gradient-to-br from-[#F3B34E] via-[#F5C16E] to-[#F3B34E] px-6 pt-14 pb-10 text-center overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-10 w-32 h-32 bg-white/10 rounded-full" />

        <div className="relative z-10">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/20 ring-4 ring-white/30 overflow-hidden">
            <Icons.Logo size={80} variant="icon" />
          </div>
          <h1 className="text-xl font-black text-white">
            {stepTitles[step]}
          </h1>
          <p className="text-sm text-white/80 mt-1 font-medium">
            {stepSubtitles[step]}
          </p>
        </div>

        {/* Step indicator — 4 steps */}
        <div className="flex gap-2 justify-center mt-6 relative z-10">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1.5 w-10 rounded-full transition-all duration-500 ${step >= s ? "bg-white" : "bg-white/30"}`} />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-5 py-6 -mt-4 relative z-10">
        {/* ─── Step 1: Phone ─── */}
        {step === 1 && (
          <div className="animate-fade-in space-y-5">
            <Card className="p-6 shadow-xl shadow-slate-200/50 border-slate-100 ring-1 ring-slate-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 bg-primary-light rounded-xl flex items-center justify-center text-primary-dark shadow-sm">
                  <Icons.Phone size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">{t("onboarding.phoneLabel")}</h3>
                  <p className="text-xs text-muted mt-0.5">{t("onboarding.phoneDesc")}</p>
                </div>
              </div>

              <div className="relative">
                <GlobalInput
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatPhone(e.target.value));
                    setPhoneError("");
                  }}
                  placeholder="08X-XXX-XXXX"
                  error={phoneError}
                  variant="default"
                  className="text-center text-lg"
                />
              </div>

              <p className="text-[11px] text-muted text-center mt-3 opacity-70">
                {t("onboarding.phonePrivacy")}
              </p>
            </Card>

            <Button
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              disabled={phone.replace(/\D/g, "").length < 10}
              onClick={handlePhoneSubmit}
            >
              {t("onboarding.nextButton")}
            </Button>
          </div>
        )}

        {/* ─── Step 2: Terms of Service ─── */}
        {step === 2 && (
          <div className="animate-fade-in space-y-5">
            <Card className="p-5 shadow-xl shadow-slate-200/50 border-slate-100 ring-1 ring-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                  <Icons.FileText size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">
                    {language === 'th' ? 'เงื่อนไขการใช้บริการ' : 'Terms & Conditions'}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    {language === 'th' ? 'กรุณาอ่านอย่างละเอียดก่อนดำเนินการต่อ' : 'Please read carefully before proceeding'}
                  </p>
                </div>
              </div>

              {/* Scrollable terms content */}
              <div className="bg-slate-50 rounded-xl p-4 max-h-[45vh] overflow-y-auto border border-slate-100 space-y-4 text-sm text-slate-600 leading-relaxed">
                <div>
                  <h4 className="font-black text-slate-800 mb-1">1. {language === 'th' ? 'การยอมรับข้อกำหนด' : 'Acceptance of Terms'}</h4>
                  <p>{language === 'th' 
                    ? 'การเข้าถึงและใช้งานแพลตฟอร์ม Rubjob ถือว่าคุณยอมรับข้อตกลงและเงื่อนไขเหล่านี้ทุกประการ หากคุณไม่ยอมรับข้อกำหนดเหล่านี้ กรุณางดเว้นการใช้บริการ'
                    : 'By accessing and using the Rubjob platform, you fully accept these terms and conditions.'}</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 mb-1">2. {language === 'th' ? 'ขอบเขตบริการ' : 'Scope of Service'}</h4>
                  <p>{language === 'th' 
                    ? 'Rubjob เป็นสื่อกลางในการเชื่อมต่อลูกค้ากับผู้ให้บริการซักอบรีดและพนักงานขนส่ง เรามุ่งมั่นที่จะให้บริการที่มีคุณภาพและปลอดภัยสูงสุดสำหรับเสื้อผ้าทุกชิ้น'
                    : 'Rubjob acts as an intermediary connecting customers with laundry service providers and delivery personnel.'}</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 mb-1">3. {language === 'th' ? 'นโยบายการชดเชย' : 'Compensation Policy'}</h4>
                  <p>{language === 'th' 
                    ? 'ในกรณีที่ผ้าเกิดความเสียหายหรือสูญหายอันเนื่องมาจากการปฏิบัติงาน Rubjob จะดำเนินการชดเชยตามเงื่อนไขที่กำหนดไว้ในนโยบายการรับประกันของเรา'
                    : 'In the event of damage or loss, Rubjob will provide compensation according to our guarantee policy.'}</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 mb-1">4. {language === 'th' ? 'ความเป็นส่วนตัว' : 'Privacy'}</h4>
                  <p>{language === 'th' 
                    ? 'เราเก็บรวบรวมข้อมูลส่วนบุคคลเท่าที่จำเป็นสำหรับการให้บริการ รวมถึง ชื่อ เบอร์โทร ที่อยู่ และตำแหน่งที่ตั้ง ข้อมูลของคุณจะถูกเก็บรักษาอย่างปลอดภัยและไม่เปิดเผยต่อบุคคลที่สาม'
                    : 'We collect personal data necessary for service delivery including name, phone, address, and location. Your data is stored securely and not shared with third parties.'}</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 mb-1">5. {language === 'th' ? 'การใช้ตำแหน่งที่ตั้ง' : 'Location Usage'}</h4>
                  <p>{language === 'th' 
                    ? 'แอปจะใช้ตำแหน่งที่ตั้งของคุณเพื่อค้นหาร้านซักอบรีดและคนขับที่อยู่ใกล้เคียง รวมถึงคำนวณค่าจัดส่งตามระยะทางจริง ตำแหน่งของคุณจะถูกใช้เฉพาะเมื่อคุณใช้งานแอปเท่านั้น'
                    : 'The app uses your location to find nearby laundry shops and drivers, and to calculate delivery fees. Your location is only used while the app is active.'}</p>
                </div>
              </div>

              {/* Agree checkbox */}
              <label className="flex items-center gap-3 mt-5 p-3.5 rounded-xl border-2 border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors active:scale-[0.98]" onClick={() => setAgreedTerms(!agreedTerms)}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${agreedTerms ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-slate-100 text-transparent border-2 border-slate-200'}`}>
                  <Icons.Check size={14} strokeWidth={4} />
                </div>
                <span className="text-sm font-bold text-slate-700">
                  {language === 'th' ? 'ฉันได้อ่านและยอมรับข้อตกลงการใช้งานแล้ว' : 'I have read and agree to the Terms of Service'}
                </span>
              </label>
            </Card>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 active:scale-95 transition-transform shrink-0"
              >
                <Icons.Back size={20} />
              </button>
              <Button
                fullWidth
                size="lg"
                disabled={!agreedTerms}
                onClick={handleTermsAccept}
              >
                {t("onboarding.nextButton")}
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Location Permission ─── */}
        {step === 3 && (
          <div className="animate-fade-in space-y-5">
            <Card className="p-6 shadow-xl shadow-slate-200/50 border-slate-100 ring-1 ring-slate-100 text-center">
              <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-5 border-2 transition-all duration-500 ${isLocating ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                {isLocating ? (
                  <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
                ) : (
                  <Icons.MapPin size={48} className="text-blue-500" />
                )}
              </div>
              <h3 className="text-lg font-black text-foreground mb-2">
                {isLocating
                  ? (language === 'th' ? 'กำลังระบุตำแหน่ง...' : 'Getting your location...')
                  : (language === 'th' ? 'เปิดใช้งานตำแหน่งที่ตั้ง' : 'Enable Location Access')}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                {isLocating
                  ? (language === 'th' ? 'รอสักครู่ ระบบกำลังดึงพิกัด GPS ของคุณ' : 'Please wait while we retrieve your GPS coordinates.')
                  : (language === 'th'
                    ? 'ในขั้นตอนถัดไป ระบบจะขออนุญาตเข้าถึงตำแหน่งของคุณ กรุณากด "อนุญาต" เพื่อให้เราค้นหาร้านซักและคำนวณค่าจัดส่งได้อย่างแม่นยำ'
                    : 'In the next step, the system will request your location. Please tap "Allow" so we can find nearby shops and calculate delivery fees accurately.')}
              </p>

              {/* Visual instruction — hide while locating */}
              {!isLocating && (
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 space-y-3">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0 text-sm font-black">1</div>
                    <p className="text-xs text-blue-700 font-bold">
                      {language === 'th' ? 'กดปุ่ม "เปิดโลเคชัน" ด้านล่าง' : 'Tap "Enable Location" below'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0 text-sm font-black">2</div>
                    <p className="text-xs text-blue-700 font-bold">
                      {language === 'th' ? 'เมื่อระบบถาม กรุณากด "อนุญาต" หรือ "Allow"' : 'When prompted, tap "Allow"'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0 text-sm font-black">3</div>
                    <p className="text-xs text-emerald-700 font-bold">
                      {language === 'th' ? 'ระบบจะตั้งค่าตำแหน่งของคุณอัตโนมัติ' : 'Your location will be set automatically'}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={isLocating}
                className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 active:scale-95 transition-transform shrink-0 disabled:opacity-40"
              >
                <Icons.Back size={20} />
              </button>
              <Button
                fullWidth
                size="lg"
                onClick={handleLocationPermission}
                disabled={isLocating}
                isLoading={isLocating}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {!isLocating && <Icons.MapPin size={18} className="mr-2 inline" />}
                {isLocating
                  ? (language === 'th' ? 'กำลังดึงตำแหน่ง...' : 'Getting location...')
                  : (language === 'th' ? 'เปิดโลเคชัน' : 'Enable Location')}
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 4: Address ─── */}
        {step === 4 && (
          <div className="animate-fade-in space-y-5">
            <Card className="p-6 shadow-xl shadow-slate-200/50 border-slate-100 ring-1 ring-slate-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 bg-primary-light rounded-xl flex items-center justify-center text-primary-dark shadow-sm">
                  <Icons.MapPin size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">{t("onboarding.addressLabel")}</h3>
                  <p className="text-xs text-muted mt-0.5">{t("onboarding.addressFirstDesc")}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Address label */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">{t("onboarding.labelTitle")}</label>
                  <div className="flex gap-2 mb-2">
                    {[
                      { key: "labelHome", text: t("onboarding.labelHome") },
                      { key: "labelOffice", text: t("onboarding.labelOffice") },
                      { key: "labelCondo", text: t("onboarding.labelCondo") },
                    ].map((item) => {
                      const label = item.text.slice(2).trim();
                      return (
                        <button
                          key={item.key}
                          onClick={() => setAddressLabel(label)}
                          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-300 border-2 ${
                            addressLabel === label
                              ? "border-primary bg-primary/5 text-primary-dark shadow-sm"
                              : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {item.text}
                        </button>
                      );
                    })}
                  </div>
                  <GlobalInput
                    type="text"
                    value={addressLabel}
                    onChange={(e) => setAddressLabel(e.target.value)}
                    placeholder={t("onboarding.labelCustomPlaceholder")}
                    variant="default"
                  />
                </div>



                {/* Note */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">{t("onboarding.noteLabel")}</label>
                  <GlobalTextarea
                    value={addressNote}
                    onChange={(e) => setAddressNote(e.target.value)}
                    placeholder={t("onboarding.notePlaceholder")}
                    rows={2}
                  />
                </div>

                {/* Pin location with real map */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">{t("onboarding.pinLabel")}</label>
                  <div className="h-52 w-full rounded-xl overflow-hidden border-2 border-slate-100">
                    <MapPicker
                      lat={pinLat || 0}
                      lng={pinLng || 0}
                      onChange={handlePinLocation}
                    />
                  </div>
                  <p className={`text-xs font-bold ${pinSet ? "text-emerald-600" : "text-slate-400"}`}>
                    {pinSet 
                      ? t("onboarding.pinSet").replace("{lat}", String(pinLat)).replace("{lng}", String(pinLng))
                      : t("onboarding.pinPrompt")}
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 active:scale-95 transition-transform shrink-0"
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
                {t("onboarding.startButton")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
