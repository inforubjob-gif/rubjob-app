"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Icons } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface PromptPayCheckoutProps {
  clientSecret: string;
  autoConfirm?: boolean;
}

export default function PromptPayCheckout({ clientSecret, autoConfirm }: PromptPayCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useTranslation();

  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasAutoConfirmed = useRef(false);

  useEffect(() => {
    if (autoConfirm && stripe && !hasAutoConfirmed.current && !isLoading && !qrCodeUrl) {
      hasAutoConfirmed.current = true;
      doConfirm();
    }
  }, [autoConfirm, stripe]);

  const doConfirm = async () => {
    if (!stripe) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPromptPayPayment(clientSecret, {
        payment_method: {
          billing_details: {
            email: "customer@rubjob.com",
            name: "Customer",
          },
        },
      });

      if (error) {
        setMessage(error.message || "An error occurred.");
      } else if (
        paymentIntent &&
        paymentIntent.status === "requires_action" &&
        paymentIntent.next_action?.type === "promptpay_display_qr_code"
      ) {
        const qrUrl = (paymentIntent.next_action as any).promptpay_display_qr_code.image_url_svg || 
                      (paymentIntent.next_action as any).promptpay_display_qr_code.image_url_png ||
                      (paymentIntent.next_action as any).promptpay_display_qr_code.hosted_instructions_url;
        
        if (qrUrl.includes('.svg') || qrUrl.includes('.png')) {
           setQrCodeUrl(qrUrl);
        } else {
           // Fallback to iframe or redirect if only hosted instructions are available
           window.location.href = qrUrl;
        }
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        window.location.href = "/success";
      }
    } catch (err: any) {
      setMessage(err?.message || "An unexpected error occurred while confirming payment.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveQR = async () => {
    if (!qrCodeUrl) return;
    try {
      // Use our proxy API to avoid CORS issues and prevent Stripe from rendering the HTML page
      const proxyUrl = `/api/payment/proxy-image?url=${encodeURIComponent(qrCodeUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) throw new Error("Failed to fetch image via proxy");
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "rubjob-promptpay-qr.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error("Failed to download QR code", err);
      // Fallback: If proxy fails, try direct download without window.open
      const link = document.createElement("a");
      link.href = qrCodeUrl;
      link.download = "rubjob-promptpay-qr.png";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    doConfirm();
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 animate-fade-in">
      {/* 📱 Specialized Mobile UX for LINE Mini-app */}
      <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-5 flex items-start gap-4 shadow-sm">
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

      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center min-h-[300px]">
          {qrCodeUrl ? (
            <div className="flex flex-col items-center animate-scale-in w-full">
              <img src={qrCodeUrl} alt="PromptPay QR Code" className="w-64 h-64 object-contain mb-6 border-4 border-slate-50 rounded-xl shadow-inner" />
              
              <button 
                onClick={handleSaveQR}
                className="mb-6 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all shadow-sm w-full max-w-[250px]"
              >
                <Icons.Download size={18} />
                {t("orders.payment.saveQR")}
              </button>

              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">{t("orders.payment.waitingForPayment")}</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center space-y-4">
              {!isLoading && !message && (
                <Icons.Payment size={48} className="text-slate-200" />
              )}
              {isLoading && (
                <Icons.Refresh size={32} className="text-primary animate-spin" />
              )}
              <Button
                disabled={isLoading || !stripe}
                onClick={handleSubmit}
                fullWidth
                className="bg-primary text-white py-5 rounded-xl font-black uppercase shadow-2xl shadow-primary/30 active:scale-95 transition-all text-sm"
                isLoading={isLoading}
              >
                {isLoading ? t("orders.payment.processing") : t("orders.payment.confirmPayment")}
              </Button>
            </div>
          )}
        </div>

        {/* Show any error or success messages */}
        {message && (
          <div id="payment-message" className="text-center text-sm font-bold text-rose-500 bg-rose-50 p-4 rounded-xl animate-bounce">
            {message}
          </div>
        )}
      </div>

      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase">
           <Icons.Shield size={12} />
           {t("orders.payment.securePaymentByStripe")}
        </div>
      </div>
    </div>
  );
}
