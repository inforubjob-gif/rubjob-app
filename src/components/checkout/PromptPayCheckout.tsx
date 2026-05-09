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
            <div className="flex flex-col items-center animate-scale-in">
              <img src={qrCodeUrl} alt="PromptPay QR Code" className="w-64 h-64 object-contain mb-4 border-4 border-slate-50 rounded-xl shadow-inner" />
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Waiting for payment...</p>
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
           100% Secure Payment by Stripe
        </div>
      </div>
    </div>
  );
}
