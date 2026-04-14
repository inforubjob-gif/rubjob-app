import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export default function Card({
  children,
  className = "",
  onClick,
  hoverable = false,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`
        ${!className.includes("bg-") ? "bg-surface" : ""} 
        rounded-2xl
        shadow-[var(--shadow-card)]
        animate-fade-in
        ${hoverable ? "hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 cursor-pointer active:scale-[0.98] hover:-translate-y-0.5" : "border-none"}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
