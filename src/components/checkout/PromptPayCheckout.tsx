"use client";

import React, { useState, useEffect } from "react";
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
}

export default function PromptPayCheckout({ clientSecret }: PromptPayCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useTranslation();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Make sure to change this to your payment completion page
        return_url: `${window.location.origin}/success`,
      },
      // Defer redirect to handle polling if needed, but for PromptPay 
      // Stripe usually handles the redirect once the user confirms.
      // In LINE Mini-app, we often stay on page or redirect to a success page.
    });

    if (error.type === "card_error" || error.type === "validation_error") {
      setMessage(error.message || "An error occurred.");
    } else {
      setMessage("An unexpected error occurred.");
    }

    setIsLoading(false);
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

      <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-xl shadow-slate-200/50">
           <PaymentElement 
            id="payment-element" 
            options={{
              layout: "tabs",
              defaultValues: {
                billingDetails: {
                  address: {
                    country: "TH"
                  }
                }
              }
            }}
          />
        </div>

        <Button
          disabled={isLoading || !stripe || !elements}
          id="submit"
          fullWidth
          className="bg-primary text-white py-5 rounded-xl font-black uppercase shadow-2xl shadow-primary/30 active:scale-95 transition-all text-sm"
          isLoading={isLoading}
        >
          {isLoading ? t("orders.payment.processing") : t("orders.payment.confirmPayment")}
        </Button>

        {/* Show any error or success messages */}
        {message && (
          <div id="payment-message" className="text-center text-sm font-bold text-rose-500 bg-rose-50 p-4 rounded-xl animate-bounce">
            {message}
          </div>
        )}
      </form>

      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase">
           <Icons.Shield size={12} />
           100% Secure Payment by Stripe
        </div>
      </div>
    </div>
  );
}
