"use client";

import { Icons } from "./Icons";
import type { OrderStatus } from "@/types";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface Step {
  key: OrderStatus;
  icon?: (props: any) => React.ReactNode;
  image?: string;
}

const STEPS: Step[] = [
  { key: "picking_up", icon: Icons.Package },
  { key: "delivering_to_store", icon: Icons.Store },
  { key: "washing", icon: Icons.WashFold },
  { key: "delivering_to_customer", icon: Icons.Bike },
  { key: "completed", icon: Icons.CheckCircle },
];

const statusOrder: OrderStatus[] = [
  "picking_up",
  "delivering_to_store",
  "washing",
  "ready_for_pickup",
  "delivering_to_customer",
  "completed",
];

interface StatusTimelineProps {
  currentStatus: OrderStatus;
}

export default function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const { t } = useTranslation();
  const currentIdx = statusOrder.indexOf(currentStatus);
  
  let startIdx = currentIdx - 1;
  if (startIdx < 0) startIdx = 0;
  if (startIdx > STEPS.length - 3) startIdx = STEPS.length - 3;
  
  const visibleSteps = STEPS.slice(startIdx, startIdx + 3);
  const firstVisibleGlobalIdx = STEPS.findIndex(s => s.key === visibleSteps[0].key);

  // How many segments (out of 2) are filled
  const filledSegments = Math.max(0, Math.min(2, currentIdx - firstVisibleGlobalIdx));

  return (
    <div className="space-y-6 py-2 px-1">
      {STEPS.map((step, index) => {
        const isDone = index < currentIdx;
        const isCurrent = index === currentIdx;
        const isFuture = index > currentIdx;
        
        return (
          <div 
            key={step.key} 
            className={`flex items-center justify-between gap-4 transition-all duration-500 ${isFuture ? "opacity-30 grayscale" : "opacity-100"}`}
          >
            {/* Left: Text Info */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className={`text-sm font-black uppercase ${isCurrent ? "text-primary-dark" : "text-slate-700"}`}>
                  {t(`orders.status.${step.key}`)}
                </h4>
                {isCurrent && (
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">
                {isDone ? t("common.done") : isCurrent ? t("common.processing") : t("common.pending")}
              </p>
            </div>

            {/* Right: Large Icon (No Border) */}
            <div className={`relative w-16 h-16 transition-transform duration-500 ${isCurrent ? "scale-110" : "scale-100"}`}>
              {step.image ? (
                <img 
                  src={step.image} 
                  alt={step.key} 
                  className="w-full h-full object-contain" 
                />
              ) : (
                step.icon && <step.icon size={32} className={isCurrent ? "text-primary" : "text-slate-400"} />
              )}
              
              {isDone && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm animate-fade-in">
                  <Icons.Check size={10} strokeWidth={4} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
