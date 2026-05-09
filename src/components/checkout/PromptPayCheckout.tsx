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

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isElementReady, setIsElementReady] = useState(false);
  const hasAutoConfirmed = useRef(false);

  // Auto-confirm: when PaymentElement is ready and autoConfirm is true,
  // automatically submit the payment to generate the QR code
  useEffect(() => {
    if (autoConfirm && isElementReady && stripe && elements && !hasAutoConfirmed.current && !isLoading) {
      hasAutoConfirmed.current = true;
      doConfirm();
    }
  }, [autoConfirm, isElementReady, stripe, elements]);

  const doConfirm = async () => {
    if (!stripe || !elements) return;

    setIsLoading(true);

    // MUST call elements.submit() before confirmPayment when using PaymentElement
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setMessage(submitError.message || "An error occurred.");
      setIsLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success`,
      },
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message || "An error occurred.");
      } else {
        setMessage(error.message || "An unexpected error occurred.");
      }
    }

    setIsLoading(false);
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

      <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-xl shadow-slate-200/50">
           <PaymentElement 
            id="payment-element"
            onReady={() => setIsElementReady(true)}
            options={{
              layout: "tabs",
              fields: {
                billingDetails: {
                  email: "never"
                }
              },
              defaultValues: {
                billingDetails: {
                  email: "customer@rubjob.com",
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
