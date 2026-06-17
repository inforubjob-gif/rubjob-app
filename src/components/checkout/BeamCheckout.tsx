"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icons } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface BeamCheckoutProps {
  qrCodeData: string; // Base64 encoded QR image from Beam
  orderId: string;
  amount?: number;
}

export default function BeamCheckout({ qrCodeData, orderId, amount }: BeamCheckoutProps) {
  const { t } = useTranslation();

  const [isPaid, setIsPaid] = useState(false);
  const [generatedQrUrl, setGeneratedQrUrl] = useState<string | null>(null);

  // Construct the QR image source from base64 data
  const qrImageSrc = qrCodeData.startsWith("data:") 
    ? qrCodeData 
    : qrCodeData.startsWith("http") 
      ? qrCodeData 
      : `data:image/png;base64,${qrCodeData}`;

  // Poll for payment success by checking order status
  useEffect(() => {
    if (isPaid) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json() as any;
        if (data.order?.paymentStatus === "paid") {
          setIsPaid(true);
          clearInterval(intervalId);
          window.location.reload(); // Reload to show updated order status
        }
      } catch (err) {
        console.error("Failed to poll order status", err);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(intervalId);
  }, [orderId, isPaid]);

  const handleSaveQR = async () => {
    try {
      // Fetch the QR image
      let blob: Blob;
      if (qrCodeData.startsWith("http")) {
        const proxyUrl = `/api/payment/proxy-image?url=${encodeURIComponent(qrCodeData)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Failed to fetch image via proxy");
        blob = await response.blob();
      } else {
        // Convert base64 to blob
        const base64Data = qrCodeData.startsWith("data:") 
          ? qrCodeData.split(",")[1] 
          : qrCodeData;
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
      if (qrCodeData.startsWith("http")) {
        window.open(qrCodeData, "_blank");
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
          <div className="flex flex-col items-center animate-scale-in w-full">
            <img src={qrImageSrc} alt="PromptPay QR Code" className="w-64 h-64 object-contain mb-6 border-4 border-slate-50 rounded-xl shadow-inner" />
            
            <button 
              onClick={handleSaveQR}
              className="mb-6 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all shadow-sm w-full max-w-[250px]"
            >
              <Icons.Download size={18} />
              {t("orders.payment.saveQR")}
            </button>

            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">{t("orders.payment.waitingForPayment")}</p>
          </div>
        </div>

        {/* Payment status indicator */}
        {isPaid && (
          <div className="text-center text-sm font-bold text-emerald-600 bg-emerald-50 p-4 rounded-xl animate-bounce">
            ✅ ชำระเงินสำเร็จแล้ว! กำลังอัพเดตสถานะ...
          </div>
        )}
      </div>

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
