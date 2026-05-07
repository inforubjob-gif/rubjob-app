import type { OrderStatus } from "@/types";

type BadgeVariant = "default" | "success" | "warning" | "info" | "danger";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-600",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-blue-50 text-blue-700",
  danger: "bg-red-50 text-red-700",
};

/**
 * Maps an OrderStatus to a Badge variant for consistent status coloring
 */
export function statusToBadgeVariant(status: OrderStatus): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    pending: "warning",
    accepted: "info",
    picking_up: "info",
    in_progress: "info",
    at_shop: "warning",
    washing: "warning",
    ready_for_return: "info",
    ready_for_pickup: "info",
    delivering_to_store: "info",
    delivering_to_customer: "info",
    completed: "success",
    cancelled: "danger",
  };
  return (map[status] || "default") as BadgeVariant;
}

export function statusLabel(status: OrderStatus): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    accepted: "Accepted",
    picking_up: "Picking Up",
    in_progress: "In Progress",
    at_shop: "At Shop",
    washing: "Washing",
    ready_for_return: "Ready for Return",
    ready_for_pickup: "Ready for Pickup",
    delivering_to_store: "Delivering to Store",
    delivering_to_customer: "Delivering to Customer",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

export default function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-1.5 rounded-md text-[10px] font-black uppercase leading-tight
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
