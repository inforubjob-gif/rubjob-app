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

  // Determine which step is currently active in the UI
  let activeStepIdx = 0;
  let currentStepInfo = steps[0];

  steps.forEach((step, index) => {
    const stepIdx = statusOrder.indexOf(step.key);
    if (currentIdx >= stepIdx) {
      activeStepIdx = index;
      currentStepInfo = step;
    }
  });

  // If we are at a status not in the steps array (like 'pending'), show the first step as pending
  if (currentIdx === 0) {
    activeStepIdx = 0;
    currentStepInfo = steps[0];
  }

  // Calculate progress percentage
  const progressPercent = Math.max(0, (activeStepIdx / (steps.length - 1)) * 100);

  return (
    <div className="space-y-5 py-2">
      {/* Horizontal Progress Bar */}
      <div className="relative px-2">
        <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-1 bg-slate-100 -z-10 rounded-full" />
        <div 
          className="absolute left-[10%] top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 rounded-full transition-all duration-700 ease-in-out" 
          style={{ width: `${progressPercent * 0.8}%` }} 
        />
        
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const stepIdx = statusOrder.indexOf(step.key);
            const isDone = stepIdx < currentIdx || (step.key === "completed" && currentStatus === "completed");
            const isCurrent = index === activeStepIdx && currentStatus !== "completed";
            
            return (
              <div key={step.key} className="relative bg-white z-10 px-1 transition-all duration-500">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                  isDone ? "bg-primary border-primary text-white" : 
                  isCurrent ? "bg-white border-primary text-primary shadow-md shadow-primary/20 scale-110" : 
                  "bg-slate-50 border-slate-100 text-slate-300"
                }`}>
                  {isDone ? <Icons.Check size={14} strokeWidth={3} /> : step.icon && <step.icon size={14} strokeWidth={2.5} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Step Card */}
      <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 flex items-center gap-4 animate-fade-in">
        <IconCircle 
          variant={currentStatus === "completed" ? "black" : "orange"} 
          size="md" 
          className="shrink-0 shadow-sm"
        >
          {currentStepInfo.icon && <currentStepInfo.icon size={22} strokeWidth={2.5} />}
        </IconCircle>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-black uppercase text-slate-900 truncate">
              {t(`orders.status.${currentStepInfo.key}`)}
            </h4>
            {currentStatus !== "completed" && (
              <span className="flex h-2 w-2 rounded-full bg-primary animate-ping shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {currentStatus === "completed" 
              ? t("orders.status.completed") 
              : currentIdx === 0 
                ? t("common.pending") 
                : t("common.processing")}
          </p>
        </div>
      </div>
    </div>
  );
}

