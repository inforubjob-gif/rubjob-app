"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface StepConfig {
  page: string;
  image: string;
}

const STEPS: StepConfig[] = [
  { page: "/", image: "/images/tutorial_step_1.png?v=2" },
  { page: "/booking", image: "/images/tutorial_step_2.png?v=2" },
  { page: "/booking", image: "/images/tutorial_step_3.png?v=2" },
  { page: "/booking", image: "/images/tutorial_step_4.png?v=2" },
  { page: "/booking", image: "/images/tutorial_step_5.png?v=2" },
  { page: "/booking", image: "/images/tutorial_step_6.png?v=2" },
  { page: "/booking", image: "/images/tutorial_step_7.png?v=2" },
  { page: "/booking", image: "/images/tutorial_step_8.png?v=2" },
];

export default function HowToOverlay({
  onComplete,
  startStep = 0,
}: {
  onComplete: () => void;
  startStep?: number;
  onStepChange?: (stepIndex: number) => void; // kept for backward compat, but unused
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(startStep);
  const [fadeIn, setFadeIn] = useState(true);

  // Use ref to avoid re-render loops from inline callbacks
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Lock body scroll while tutorial is visible
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    const origPosition = document.body.style.position;
    const origTop = document.body.style.top;
    const origWidth = document.body.style.width;
    const scrollY = window.scrollY;

    // Fix the body in place to prevent scroll on iOS / Android WebView
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.position = origPosition;
      document.body.style.top = origTop;
      document.body.style.width = origWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Fade-in animation on step change
  useEffect(() => {
    setFadeIn(false);
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadeIn(true));
    });
    return () => cancelAnimationFrame(t);
  }, [currentStep]);

  const handleNext = useCallback(() => {
    const nextIdx = currentStep + 1;

    // Last step → complete
    if (nextIdx >= STEPS.length) {
      onCompleteRef.current();
      return;
    }

    const currentPage = STEPS[currentStep].page;
    const nextPage = STEPS[nextIdx].page;

    // Cross-page navigation (Home → Booking)
    if (nextPage !== currentPage) {
      try {
        sessionStorage.setItem("rubjob_tutorial_step", String(nextIdx));
      } catch (err) {
        console.warn("sessionStorage not accessible", err);
      }
      router.push(`${nextPage}?service=wash_fold&tutorial=${nextIdx}`);
      return;
    }

    setCurrentStep(nextIdx);
  }, [currentStep, router]);

  const handleSkip = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCompleteRef.current();
  }, []);

  const handleNextButton = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleNext();
  }, [handleNext]);

  const step = STEPS[currentStep];
  if (!step) return null;

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{
        touchAction: "none",
        overscrollBehavior: "none",
        WebkitOverflowScrolling: "auto",
      }}
      onClick={handleNext}
      onTouchMove={(e) => e.preventDefault()}
    >
      {/* Dark backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.78)" }}
      />

      {/* Tutorial Image — centered */}
      <div className="absolute inset-0 flex items-center justify-center p-6 pb-24">
        <img
          key={`step-${currentStep}`}
          src={step.image}
          alt=""
          className="pointer-events-none select-none"
          style={{
            maxWidth: "88vw",
            maxHeight: "65vh",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.5))",
            opacity: fadeIn ? 1 : 0,
            transform: fadeIn ? "scale(1)" : "scale(0.92)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}
        />
      </div>

      {/* Step counter badge */}
      <div className="absolute top-[env(safe-area-inset-top,0px)] left-0 right-0 flex justify-center pt-12">
        <span className="bg-white/15 backdrop-blur-md text-white text-[11px] font-black px-4 py-1.5 rounded-full tracking-wider">
          {currentStep + 1} / {STEPS.length}
        </span>
      </div>

      {/* Bottom controls */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[10004] px-5 pb-8 pt-16 flex items-center justify-between"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
        }}
      >
        <button
          onClick={handleSkip}
          className="text-white/50 text-[11px] font-black uppercase tracking-widest px-3 py-3 active:text-white/80 transition-colors"
        >
          ข้าม
        </button>

        <div className="flex gap-1.5 items-center">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "bg-white w-5 h-2"
                  : i < currentStep
                  ? "bg-white/50 w-2 h-2"
                  : "bg-white/25 w-2 h-2"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNextButton}
          className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-black text-sm shadow-2xl active:scale-95 transition-transform"
        >
          {currentStep === STEPS.length - 1 ? "เสร็จสิ้น" : "ถัดไป"}
        </button>
      </div>
    </div>
  );
}
