interface SkeletonProps {
  className?: string;
  variant?: "rect" | "circle" | "text";
}

export default function Skeleton({ className = "", variant = "rect" }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-slate-200";
  const variantClasses = {
    rect: "rounded-lg",
    circle: "rounded-full",
    text: "rounded-lg h-3 w-full",
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{
        background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite linear"
      }}
    />
  );
}
