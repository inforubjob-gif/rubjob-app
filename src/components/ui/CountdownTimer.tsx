"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface CountdownTimerProps {
  seconds: number;
  onAlarm?: () => void;
  urgentThreshold?: number; // seconds
}

export default function CountdownTimer({ 
  seconds: initialSeconds, 
  onAlarm, 
  urgentThreshold = 1800 // default 30 mins
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const { t } = useTranslation();

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next === urgentThreshold) {
          onAlarm?.();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, urgentThreshold, onAlarm]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + ":" : ""}${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const isUrgent = timeLeft <= urgentThreshold;

  return (
    <div className={`flex flex-col items-end ${isUrgent ? "text-red-600" : "text-slate-600"} drop-shadow-sm`}>
      <span className={`text-[11px] font-black uppercase tracking-[0.1em] mb-0.5 ${isUrgent ? "animate-pulse text-red-700 font-black" : ""}`}>
        {isUrgent ? t("staff.urgent") : t("staff.timeLeft")}
      </span>
      <span className={`text-sm font-black tabular-nums tracking-tight ${isUrgent ? "scale-110 origin-right transition-transform" : ""}`}>
        {formatTime(timeLeft)}
      </span>
    </div>
  );
}
