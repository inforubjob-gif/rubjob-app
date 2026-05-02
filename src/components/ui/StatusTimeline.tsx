"use client";

import { Icons } from "./Icons";
import type { OrderStatus, OrderType } from "@/types";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface Step {
  key: OrderStatus;
  icon?: (props: any) => React.ReactNode;
  image?: string;
}

const LOGISTICS_STEPS: Step[] = [
  { key: "picking_up", icon: Icons.Package },
  { key: "delivering_to_store", icon: Icons.Store },
  { key: "washing", icon: Icons.WashFold },
  { key: "delivering_to_customer", icon: Icons.Bike },
  { key: "completed", icon: Icons.CheckCircle },
];

const DIRECT_STEPS: Step[] = [
  { key: "accepted", icon: Icons.User },
  { key: "in_progress", icon: Icons.Truck }, // Traveling to customer
  { key: "completed", icon: Icons.CheckCircle },
];

const LOGISTICS_ORDER: OrderStatus[] = [
  "pending",
  "picking_up",
  "delivering_to_store",
  "washing",
  "ready_for_pickup",
  "delivering_to_customer",
  "completed",
];

const DIRECT_ORDER: OrderStatus[] = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
];

interface StatusTimelineProps {
  currentStatus: OrderStatus;
  orderType?: OrderType;
}

export default function StatusTimeline({ currentStatus, orderType = "logistics" }: StatusTimelineProps) {
  const { t } = useTranslation();
  
  const isDirect = orderType === "direct_service";
  const steps = isDirect ? DIRECT_STEPS : LOGISTICS_STEPS;
  const statusOrder = isDirect ? DIRECT_ORDER : LOGISTICS_ORDER;
  
  const currentIdx = statusOrder.indexOf(currentStatus);

  return (
    <div className="space-y-6 py-2 px-1">
      {steps.map((step, index) => {
        // Map step key to index in statusOrder
        const stepIdx = statusOrder.indexOf(step.key);
        const isDone = stepIdx < currentIdx;
        const isCurrent = step.key === currentStatus || (step.key === "completed" && currentStatus === "completed");
        const isFuture = stepIdx > currentIdx && !isCurrent;
        
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

            {/* Right: Icon */}
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
