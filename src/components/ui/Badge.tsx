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
  const map: Record<OrderStatus, BadgeVariant> = {
    pending: "warning",
    picking_up: "info",
    delivering_to_store: "info",
    washing: "warning",
    delivering_to_customer: "info",
    completed: "success",
    cancelled: "danger",
  };
  return map[status];
}

export function statusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: "Pending",
    picking_up: "Picking Up",
    delivering_to_store: "Delivering to Store",
    washing: "Washing",
    delivering_to_customer: "Delivering to Customer",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status];
}

export default function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
