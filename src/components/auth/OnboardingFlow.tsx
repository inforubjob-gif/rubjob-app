"use client";

import { useState, useEffect } from "react";
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
  const [isCheckingProgress, setIsCheckingProgress] = useState(true);

  // Resume from the step where user left off (if they exited mid-onboarding before)
  useEffect(() => {
    if (!profile?.userId) {
      setIsCheckingProgress(false);
      return;
    }
    async function checkProgress() {
      try {
        const res = await fetch(`/api/user/${profile?.userId}`);
        if (!res.ok) { setIsCheckingProgress(false); return; }
        const data = await res.json() as any;
        const user = data.user;
        if (!user) { setIsCheckingProgress(false); return; }

        if (user.phone && user.termsAcceptedAt) {
          // Phone + terms done → skip to location/address (Step 3)
          setStep(3);
        } else if (user.phone) {
          // Phone done, terms not yet → skip to terms (Step 2)
          setPhone(user.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'));
          setStep(2);
        }
        // else: start from Step 1
      } catch (err) {
        console.error("Failed to check onboarding progress:", err);
      } finally {
        setIsCheckingProgress(false);
      }
    }
    checkProgress();
  }, [profile?.userId]);

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
    // Fire-and-forget: record terms acceptance timestamp in DB for legal evidence
    fetch("/api/user/accept-terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile?.userId }),
    }).catch(err => console.error("Failed to save terms acceptance:", err));

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
    if (!addressLabel.trim()) return;
    setIsSubmitting(true);

    try {
      // Use label as fallback for details if not provided
      const finalDetails = addressDetails.trim() || addressLabel.trim();
      const res = await fetch("/api/user/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile?.userId,
          label: addressLabel.trim(),
          details: finalDetails,
          note: addressNote.trim() || null,
          lat: pinLat,
          lng: pinLng,
          isDefault: true,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as any;
        throw new Error(errData.error || "Failed to save address");
      }
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

  if (isCheckingProgress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-white">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase animate-pulse">กำลังเตรียมข้อมูล...</p>
      </div>
    );
  }

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
                    ? 'การเข้าใช้งานและใช้บริการของ Rubjob ถือว่าผู้ใช้งานรับทราบและยอมรับข้อกำหนด เงื่อนไข และนโยบายทั้งหมดของแพลตฟอร์ม'
                    : "By accessing and using Rubjob's services, the user acknowledges and accepts all terms, conditions, and policies of the platform."}</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 mb-1">2. {language === 'th' ? 'ขอบเขตการให้บริการ' : 'Scope of Service'}</h4>
                  <p>{language === 'th' 
                    ? 'Rubjob เป็นแพลตฟอร์มตัวกลางในการเชื่อมต่อผู้ใช้งานกับผู้ให้บริการ พาร์ทเนอร์ร้านค้า และผู้ขับขี่ เพื่ออำนวยความสะดวกด้านการรับ–ส่งและบริการอื่น ๆ ที่ระบบรองรับ บริษัทขอสงวนสิทธิ์ในการปรับเปลี่ยน เพิ่ม หรือลดประเภทบริการตามความเหมาะสมโดยไม่ต้องแจ้งให้ทราบล่วงหน้า'
                    : 'Rubjob is an intermediary platform connecting users with service providers, partner merchants, and drivers to facilitate delivery and other supported services. The Company reserves the right to modify, add, or reduce service types as appropriate without prior notice.'}</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 mb-1">3. {language === 'th' ? 'การส่งมอบสินค้าและทรัพย์สิน' : 'Delivery of Goods and Property'}</h4>
                  <p>{language === 'th' 
                    ? 'ผู้ใช้งานมีหน้าที่ตรวจสอบทรัพย์สินก่อนส่งมอบทุกครั้ง และไม่ควรเก็บเงินสด เอกสารสำคัญ ของมีค่า วัตถุอันตราย หรือสิ่งผิดกฎหมายไว้ภายในสิ่งของที่ส่งมอบให้บริการ บริษัทขอสงวนสิทธิ์ในการปฏิเสธหรือไม่รับผิดชอบต่อค่าเสียหายที่เกิดจากการให้บริการในกรณีที่พบวัตถุต้องห้ามหรือสิ่งที่อาจก่อให้เกิดความเสียหายต่อระบบการให้บริการ'
                    : 'Users are responsible for inspecting their property before each delivery. Cash, important documents, valuables, hazardous materials, or illegal items should not be kept inside the delivered goods. The Company reserves the right to refuse service or disclaim liability for any damage resulting from services if prohibited items or items that may cause damage to the service system are found.'}</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 mb-1">4. {language === 'th' ? 'การตรวจสอบและบันทึกข้อมูลการให้บริการ' : 'Inspection and Recording of Service Data'}</h4>
                  <p>{language === 'th' 
                    ? 'เพื่อรักษามาตรฐานคุณภาพและความปลอดภัย ระบบอาจมีการบันทึกรูปภาพสินค้า ข้อมูลการรับ–ส่ง ตำแหน่งที่ตั้ง ระยะเวลาในการดำเนินงาน รวมถึงข้อมูลการติดต่อที่เกี่ยวข้องกับการให้บริการ ข้อมูลดังกล่าวจะถูกใช้เพื่อยืนยันรายการ ตรวจสอบคุณภาพ และป้องกันข้อพิพาทที่อาจเกิดขึ้น'
                    : 'To maintain quality standards and safety, the system may record images of goods, delivery information, location, duration of operations, and contact details related to the service. This information will be used to confirm transactions, monitor quality, and prevent disputes.'}</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 mb-1">5. {language === 'th' ? 'นโยบายความเสียหายและการชดเชย' : 'Damage and Compensation Policy'}</h4>
                  <p>{language === 'th' 
                    ? 'ในกรณีที่เกิดความเสียหายหรือสูญหายอันเกิดจากกระบวนการดำเนินงานของ Rubjob บริษัทจะพิจารณาการชดเชยตามความเหมาะสมและเงื่อนไขที่กำหนด ทั้งนี้ บริษัทไม่รับผิดชอบต่อความเสียหายที่เกิดจากคุณสมบัติเฉพาะของสินค้า การเสื่อมสภาพตามธรรมชาติ คราบที่ไม่สามารถกำจัดได้ สีตก ผ้าหด ผ้าย้วย หรือความเสียหายที่เกิดจากข้อมูลที่ผู้ใช้งานไม่ได้แจ้งล่วงหน้า ผู้ใช้งานต้องแจ้งปัญหาภายใน 24 ชั่วโมงหลังได้รับสินค้า'
                    : "In the event of damage or loss caused by Rubjob's operations, the Company will consider compensation based on appropriateness and specified conditions. The Company is not responsible for damages caused by the unique characteristics of the goods, natural wear and tear, unremovable stains, color bleeding, shrinkage, stretching, or damages resulting from information not disclosed in advance. Users must report any issues within 24 hours of receiving the goods."}</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 mb-1">6. {language === 'th' ? 'การใช้พาร์ทเนอร์และผู้ให้บริการภายนอก' : 'Use of Partners & Third Parties'}</h4>
                  <p>{language === 'th' 
                    ? 'บริการบางส่วนอาจดำเนินการผ่านร้านค้า พาร์ทเนอร์ หรือผู้ให้บริการภายนอกที่ร่วมงานกับ Rubjob โดยบริษัทจะดำเนินการคัดเลือกตามมาตรฐานที่เหมาะสมเพื่อให้เกิดคุณภาพและความปลอดภัยในการให้บริการ'
                    : 'Some services may be performed through merchants, partners, or third-party service providers collaborating with Rubjob. The Company will select them in accordance with appropriate standards to ensure service quality and safety.'}</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 mb-1">7. {language === 'th' ? 'การเก็บรวบรวมและใช้ข้อมูลส่วนบุคคล' : 'Collection and Use of Personal Data'}</h4>
                  <p>{language === 'th' 
                    ? 'Rubjob อาจเก็บรวบรวมข้อมูลที่จำเป็นต่อการให้บริการ เช่น ชื่อ เบอร์โทรศัพท์ ที่อยู่ ตำแหน่งที่ตั้ง ประวัติการใช้บริการ รูปภาพ ข้อมูลการชำระเงิน และข้อมูลอื่นที่เกี่ยวข้องกับการดำเนินงาน โดยข้อมูลดังกล่าวจะถูกใช้เพื่อดำเนินการให้บริการ ติดต่อประสานงาน ปรับปรุงคุณภาพบริการ วิเคราะห์การใช้งาน รวมถึงการส่งข่าวสาร โปรโมชั่น หรือสิทธิพิเศษตามที่ผู้ใช้งานยินยอม'
                    : 'Rubjob may collect personal data necessary for providing services, such as name, phone number, address, location, service history, photos, payment information, and other operation-related data. Such data will be used to process services, coordinate, improve service quality, analyze usage, and send news, promotions, or special offers as consented by the user.'}</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 mb-1">8. {language === 'th' ? 'การเปิดเผยข้อมูลแก่บุคคลภายนอก' : 'Disclosure of Information to Third Parties'}</h4>
                  <p>{language === 'th' 
                    ? 'ข้อมูลบางส่วนอาจถูกเปิดเผยแก่ผู้ขับขี่ ร้านค้า พาร์ทเนอร์ ระบบชำระเงิน หรือผู้ให้บริการที่เกี่ยวข้องเท่าที่จำเป็นต่อการดำเนินงาน โดยบริษัทจะดำเนินการตามมาตรการรักษาความปลอดภัยและกฎหมายคุ้มครองข้อมูลส่วนบุคคลที่เกี่ยวข้อง'
                    : 'Certain information may be disclosed to drivers, merchants, partners, payment systems, or related service providers as necessary for operations. The Company will act in compliance with safety measures and relevant personal data protection laws.'}</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 mb-1">9. {language === 'th' ? 'การใช้ตำแหน่งที่ตั้ง' : 'Use of Location'}</h4>
                  <p>{language === 'th' 
                    ? 'ระบบอาจเข้าถึงข้อมูลตำแหน่งที่ตั้งของผู้ใช้งานเพื่อคำนวณค่าบริการ ค้นหาผู้ให้บริการใกล้เคียง ติดตามสถานะงาน และเพิ่มประสิทธิภาพในการให้บริการ โดยข้อมูลตำแหน่งจะถูกใช้งานเฉพาะในส่วนที่เกี่ยวข้องกับการดำเนินงานเท่านั้น'
                    : "The system may access the user's location data to calculate service fees, find nearby service providers, track job status, and enhance service efficiency. Location data will be used solely for purposes related to operations."}</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 mb-1">10. {language === 'th' ? 'สิทธิของผู้ใช้งาน' : 'User Rights'}</h4>
                  <p>{language === 'th' 
                    ? 'ผู้ใช้งานมีสิทธิในการเข้าถึง แก้ไข ถอนความยินยอม หรือขอลบข้อมูลส่วนบุคคลตามสิทธิที่กฎหมายกำหนด โดยสามารถติดต่อทีมงานผ่านช่องทางที่ระบุภายในแพลตฟอร์ม'
                    : 'Users have the right to access, rectify, withdraw consent, or request the deletion of their personal data as prescribed by law, by contacting the team through the channels specified within the platform.'}</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 mb-1">11. {language === 'th' ? 'การเปลี่ยนแปลงข้อกำหนด' : 'Amendments to Terms'}</h4>
                  <p>{language === 'th' 
                    ? 'บริษัทขอสงวนสิทธิ์ในการแก้ไข ปรับปรุง หรือเปลี่ยนแปลงข้อกำหนดและเงื่อนไขการใช้บริการได้ตามความเหมาะสม โดยการใช้งานอย่างต่อเนื่องหลังมีการเปลี่ยนแปลง ถือว่าผู้ใช้งานยอมรับข้อกำหนดฉบับล่าสุดของแพลตฟอร์ม'
                    : 'The Company reserves the right to amend, update, or change the terms and conditions of service as appropriate. Continued use after changes are made constitutes acceptance of the latest terms of the platform.'}</p>
                </div>
              </div>

              {/* Agree checkbox */}
              <label className="flex items-center gap-3 mt-5 p-3.5 rounded-xl border-2 border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors active:scale-[0.98]" onClick={() => setAgreedTerms(!agreedTerms)}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${agreedTerms ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-slate-100 text-transparent border-2 border-slate-200'}`}>
                  <Icons.Check size={14} strokeWidth={4} />
                </div>
                <span className="text-sm font-bold text-slate-700">
                  {language === 'th' 
                    ? 'ข้าพเจ้าได้อ่าน ทำความเข้าใจ และยอมรับข้อกำหนด เงื่อนไข รวมถึงนโยบายความเป็นส่วนตัวของ Rubjob แล้ว' 
                    : 'I have read, understood, and accepted the terms, conditions, and privacy policy of Rubjob.'}
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
                  <div className="h-72 w-full rounded-xl overflow-hidden border-2 border-slate-100">
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
                disabled={!addressLabel.trim()}
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
