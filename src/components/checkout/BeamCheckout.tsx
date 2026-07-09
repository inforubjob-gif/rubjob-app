"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icons } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/components/providers/LanguageProvider";

/** QR Code expiry time in seconds (Beam PromptPay QR typically expires in 10 minutes) */
const QR_EXPIRY_SECONDS = 10 * 60;
/** Max number of polls before giving up (10 min ÷ 3s = 200 polls) */
const MAX_POLL_COUNT = 200;

interface BeamCheckoutProps {
  qrCodeData: string; // Base64 encoded QR image from Beam
  orderId: string;
  amount?: number;
}

export default function BeamCheckout({ qrCodeData, orderId, amount }: BeamCheckoutProps) {
  const { t } = useTranslation();

  const [isPaid, setIsPaid] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(QR_EXPIRY_SECONDS);
  const [generatedQrUrl, setGeneratedQrUrl] = useState<string | null>(null);
  const pollCountRef = useRef(0);

  // ─── Slip Upload State ───
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);
  const [slipUploaded, setSlipUploaded] = useState(false);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safety: ensure qrCodeData is always a string
  const safeQrData = typeof qrCodeData === "string" ? qrCodeData : String(qrCodeData || "");

  // Construct the QR image source from base64 data
  const qrImageSrc = safeQrData.startsWith("data:") 
    ? safeQrData 
    : safeQrData.startsWith("http") 
      ? safeQrData 
      : `data:image/png;base64,${safeQrData}`;

  // ─── FIX 1: Redirect to order page instead of reload ───
  // ─── FIX 2: Add polling timeout (max 200 polls = ~10 min) ───
  useEffect(() => {
    if (isPaid || isExpired) return;

    const intervalId = setInterval(async () => {
      pollCountRef.current += 1;

      // Stop polling after max attempts
      if (pollCountRef.current >= MAX_POLL_COUNT) {
        console.warn(`[BeamCheckout] Max poll count (${MAX_POLL_COUNT}) reached for order ${orderId}`);
        clearInterval(intervalId);
        setIsExpired(true);
        return;
      }

      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json() as any;
        if (data.order?.paymentStatus === "paid") {
          setIsPaid(true);
          clearInterval(intervalId);
          // ✅ FIX: Redirect to order detail page instead of reload
          // Small delay to show success message before redirect
          setTimeout(() => {
            window.location.href = `/orders/${orderId}`;
          }, 1500);
        }
      } catch (err) {
        console.error("Failed to poll order status", err);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(intervalId);
  }, [orderId, isPaid, isExpired]);

  // ─── FIX 3: QR Expiry Countdown Timer ───
  useEffect(() => {
    if (isPaid || isExpired) return;

    const timerId = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isPaid, isExpired]);

  // Format seconds as MM:SS
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Regenerate QR by calling checkout API again
  const handleRegenerateQR = useCallback(async () => {
    if (!orderId || !amount) return;
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, amount }),
      });
      const data = await res.json() as any;
      if (res.ok && data.qrCodeData) {
        // Reset state and reload page to get new QR
        setIsExpired(false);
        setSecondsLeft(QR_EXPIRY_SECONDS);
        pollCountRef.current = 0;
        window.location.reload();
      } else {
        console.error("Failed to regenerate QR:", data.error);
        // If already paid, redirect
        if (data.error === "Already paid") {
          window.location.href = `/orders/${orderId}`;
        }
      }
    } catch (err) {
      console.error("QR regeneration error:", err);
    } finally {
      setIsRegenerating(false);
    }
  }, [orderId, amount]);

  // ─── Slip Upload Handler ───
  const handleSlipUpload = useCallback(async (file: File) => {
    if (!file || !orderId) return;
    setIsUploadingSlip(true);
    try {
      // Preview
      const reader = new FileReader();
      reader.onload = (e) => setSlipPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("orderId", orderId);

      const res = await fetch("/api/payment/slip", {
        method: "POST",
        body: formData,
      });
      const data = await res.json() as any;

      if (res.ok && data.success) {
        setSlipUploaded(true);
        // Continue polling — admin might confirm quickly
      } else if (data.alreadyPaid) {
        // Order was already paid (webhook came through)
        setIsPaid(true);
        setTimeout(() => {
          window.location.href = `/orders/${orderId}`;
        }, 1500);
      } else {
        console.error("Slip upload failed:", data.error);
        alert(data.error || "อัพโหลดไม่สำเร็จ กรุณาลองอีกครั้ง");
      }
    } catch (err) {
      console.error("Slip upload error:", err);
      alert("เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
    } finally {
      setIsUploadingSlip(false);
    }
  }, [orderId]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSlipUpload(file);
  }, [handleSlipUpload]);

  const handleSaveQR = async () => {
    try {
      // Fetch the QR image
      let blob: Blob;
      if (safeQrData.startsWith("http")) {
        const proxyUrl = `/api/payment/proxy-image?url=${encodeURIComponent(safeQrData)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Failed to fetch image via proxy");
        blob = await response.blob();
      } else {
        // Convert base64 to blob
        const base64Data = safeQrData.startsWith("data:") 
          ? safeQrData.split(",")[1] 
          : safeQrData;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: "image/png" });
      }

      const qrBlobUrl = window.URL.createObjectURL(blob);

      // Create a canvas to draw the custom beautiful QR image
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      // Set dimensions (Professional portrait ratio)
      canvas.width = 600;
      canvas.height = 850;

      // Draw background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Header Banner (Rubjob CI Orange)
      ctx.fillStyle = "#FF9F1C";
      ctx.fillRect(0, 0, canvas.width, 140);

      // Load and Draw Rubjob Logo
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        logoImg.src = `${window.location.origin}/images/rubjob-complete_Text-white.png`;
      });
      const logoHeight = 90;
      const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
      const logoY = (140 - logoHeight) / 2;
      ctx.drawImage(logoImg, (canvas.width - logoWidth) / 2, logoY, logoWidth, logoHeight);

      // Load QR Image
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
        qrImg.src = qrBlobUrl;
      });

      // Draw QR Code
      const qrSize = 420;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 190;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Draw "Scan to Pay" text
      ctx.fillStyle = "#334155";
      ctx.font = "bold 28px 'Helvetica Neue', Helvetica, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("สแกนเพื่อชำระเงิน / Scan to Pay", canvas.width / 2, 660);

      // Draw Amount
      if (amount) {
        ctx.fillStyle = "#FF9F1C";
        ctx.font = "900 64px 'Helvetica Neue', Helvetica, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`฿${amount.toLocaleString()}`, canvas.width / 2, 740);
      }

      // Draw Footer
      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px 'Helvetica Neue', Helvetica, Arial, sans-serif";
      ctx.fillText("ขอบคุณที่ใช้บริการ Rubjob", canvas.width / 2, 810);

      canvas.toBlob(async (canvasBlob) => {
        if (!canvasBlob) return;
        
        const generatedDataUrl = URL.createObjectURL(canvasBlob);
        setGeneratedQrUrl(generatedDataUrl);

        try {
          if (navigator.share && navigator.canShare) {
            const file = new File([canvasBlob], `rubjob-qr-${amount || 'payment'}.png`, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'QR Code สำหรับชำระเงิน',
              });
              return;
            }
          }
        } catch (e) {
          console.error("Web Share failed", e);
        }

        const link = document.createElement("a");
        link.href = generatedDataUrl;
        link.download = `rubjob-qr-${amount || 'payment'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      }, "image/png");

      window.URL.revokeObjectURL(qrBlobUrl);
    } catch (err) {
      console.error("Failed to generate custom QR", err);
      // Fallback: open QR in new tab
      if (safeQrData.startsWith("http")) {
        window.open(safeQrData, "_blank");
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* 📱 Specialized Mobile UX for LINE Mini-app */}
      <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-5 flex items-start gap-4 shadow-sm animate-fade-in">
        <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
           <Icons.Camera size={24} strokeWidth={2.5} />
        </div>
        <div className="space-y-1">
          <p className="text-blue-900 font-black text-sm uppercase">{t("orders.payment.promptPaySteps")}</p>
          <p className="text-blue-700 text-xs font-bold leading-relaxed">
            {t("orders.payment.promptPayDesc").split("QR Code").map((part, i, arr) => (
              <React.Fragment key={i}>
                {part}
                {i < arr.length - 1 && <span className="font-black underline">QR Code</span>}
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>

      <div className="space-y-6 animate-fade-in">
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center min-h-[300px]">
          {/* ─── QR Expired State ─── */}
          {isExpired && !isPaid ? (
            <div className="flex flex-col items-center text-center py-6 animate-fade-in">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10">
                <Icons.AlertCircle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-1">QR Code หมดอายุ</h3>
              <p className="text-xs font-bold text-slate-400 mb-6 leading-relaxed max-w-[240px]">
                QR Code นี้หมดอายุแล้ว กรุณากดปุ่มด้านล่างเพื่อสร้าง QR ใหม่
              </p>
              <div className="flex flex-col gap-3 w-full max-w-[280px]">
                <button
                  onClick={handleRegenerateQR}
                  disabled={isRegenerating}
                  className="flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 w-full"
                >
                  {isRegenerating ? (
                    <><Icons.Loading className="animate-spin" size={18} /> กำลังสร้าง...</>
                  ) : (
                    <><Icons.Refresh size={18} /> สร้าง QR ใหม่</>
                  )}
                </button>

                {/* ─── Slip Upload (Expired State) ─── */}
                {!slipUploaded ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingSlip}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-emerald-200 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-50 active:scale-95 transition-all disabled:opacity-50 w-full"
                  >
                    {isUploadingSlip ? (
                      <><Icons.Loading className="animate-spin" size={16} /> กำลังอัพโหลด...</>
                    ) : (
                      <><Icons.Camera size={16} /> แนบสลิปการโอนเงิน</>
                    )}
                  </button>
                ) : (
                  <div className="bg-emerald-50 border-2 border-emerald-100 rounded-xl p-4 animate-fade-in">
                    {slipPreview && (
                      <img src={slipPreview} alt="สลิป" className="w-full h-32 object-cover rounded-lg mb-3 border border-emerald-200" />
                    )}
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <Icons.Check size={16} strokeWidth={3} />
                      <span className="text-xs font-black">ส่งสลิปเรียบร้อยแล้ว!</span>
                    </div>
                    <p className="text-[10px] text-emerald-500 font-bold leading-relaxed">
                      กำลังตรวจสอบการชำระเงิน... เมื่อตรวจสอบเสร็จ Rubber จะเข้าไปรับผ้าของคุณ
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center animate-scale-in w-full">
              <img src={qrImageSrc} alt="PromptPay QR Code" className="w-64 h-64 object-contain mb-4 border-4 border-slate-50 rounded-xl shadow-inner" />
              
              {/* ─── Countdown Timer ─── */}
              {!isPaid && (
                <div className={`mb-4 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider ${
                  secondsLeft <= 60 
                    ? "bg-red-50 text-red-500 animate-pulse" 
                    : secondsLeft <= 180 
                      ? "bg-amber-50 text-amber-600" 
                      : "bg-slate-50 text-slate-400"
                }`}>
                  <Icons.Clock size={14} />
                  <span>หมดอายุใน {formatTime(secondsLeft)}</span>
                </div>
              )}
              
              <button 
                onClick={handleSaveQR}
                className="mb-6 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all shadow-sm w-full max-w-[250px]"
              >
                <Icons.Download size={18} />
                {t("orders.payment.saveQR")}
              </button>

              {!isPaid && (
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">{t("orders.payment.waitingForPayment")}</p>
              )}
            </div>
          )}
        </div>

        {/* Payment success indicator */}
        {isPaid && (
          <div className="text-center text-sm font-bold text-emerald-600 bg-emerald-50 p-4 rounded-xl animate-fade-in">
            <div className="flex items-center justify-center gap-2">
              <Icons.Check size={20} strokeWidth={3} />
              <span>ชำระเงินสำเร็จแล้ว! กำลังไปหน้าสถานะงาน...</span>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input for slip upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase">
           <Icons.Shield size={12} />
           ระบบชำระเงินปลอดภัย 100% โดย Beam
        </div>
      </div>

      {generatedQrUrl && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in" onClick={() => setGeneratedQrUrl(null)}>
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm flex flex-col items-center animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-3">
              <Icons.Download size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-1">บันทึกรูปภาพสำเร็จ?</h3>
            <p className="text-xs font-bold text-slate-500 mb-6 text-center leading-relaxed">
              หากรูปภาพไม่ถูกบันทึกลงในอัลบั้มของคุณ<br/>
              <span className="text-primary font-black">กรุณาแตะค้างที่รูปภาพด้านล่างเพื่อบันทึก (Save Image)</span>
            </p>
            
            <img src={generatedQrUrl} alt="QR Code" className="w-full h-auto rounded-2xl shadow-xl border-4 border-slate-100" />
            
            <button 
              onClick={() => setGeneratedQrUrl(null)}
              className="mt-6 w-full py-3.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-black text-slate-600 active:scale-95 transition-all text-sm uppercase"
            >
              ปิดหน้าต่างนี้ (Close)
            </button>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
