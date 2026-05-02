"use client";

import { Icons, IconCircle } from "./Icons";
import type { OrderStatus, OrderType } from "@/types";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface Step {
  key: OrderStatus;
  icon?: (props: any) => React.ReactNode;
  image?: string;
  variant?: "orange" | "yellow" | "white" | "black" | "slate";
}

const LOGISTICS_STEPS: Step[] = [
  { key: "picking_up", icon: Icons.Package, variant: "orange" },
  { key: "delivering_to_store", icon: Icons.Store, variant: "black" },
  { key: "washing", icon: Icons.WashFold, variant: "yellow" },
  { key: "delivering_to_customer", icon: Icons.Bike, variant: "orange" },
  { key: "completed", icon: Icons.CheckCircle, variant: "black" },
];

const DIRECT_STEPS: Step[] = [
  { key: "accepted", icon: Icons.User, variant: "orange" },
  { key: "in_progress", icon: Icons.Truck, variant: "black" }, 
  { key: "completed", icon: Icons.CheckCircle, variant: "black" },
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
    <div className="space-y-8 py-4 px-1">
      {steps.map((step, index) => {
        // Map step key to index in statusOrder
        const stepIdx = statusOrder.indexOf(step.key);
        const isDone = stepIdx < currentIdx;
        const isCurrent = step.key === currentStatus || (step.key === "completed" && currentStatus === "completed");
        const isFuture = stepIdx > currentIdx && !isCurrent;
        
        return (
          <div 
            key={step.key} 
            className={`flex items-center justify-between gap-6 transition-all duration-500 ${isFuture ? "opacity-30 grayscale" : "opacity-100"}`}
          >
            {/* Right: Icon (Moved to left for better timeline flow if desired, but keeping layout) */}
            <div className={`relative shrink-0 transition-all duration-500 ${isCurrent ? "scale-110" : "scale-100"}`}>
               <IconCircle 
                  variant={isCurrent ? "orange" : isDone ? "black" : "slate"} 
                  size="lg"
                  className={isCurrent ? "ring-4 ring-primary/20 shadow-xl shadow-primary/20" : ""}
               >
                 {step.icon && <step.icon size={28} strokeWidth={2.5} />}
               </IconCircle>
              
              {isDone && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm animate-fade-in z-10">
                  <Icons.Check size={12} strokeWidth={4} />
                </div>
              )}
            </div>

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
          </div>
        );
      })}
    </div>
  );
}

