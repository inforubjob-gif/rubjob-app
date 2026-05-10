import React from "react";

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number;
  strokeWidth?: number; // Maps to 'wght' in Material Symbols
  fill?: boolean;
}

const MaterialIcon = ({ 
  name, 
  size = 24, 
  strokeWidth = 2.5, 
  fill = false,
  className = "",
  ...props 
}: IconProps & { name: string }) => {
  // Map Lucide-like strokeWidth (1-3) to Material Symbols weight (100-700)
  // 2.5 -> 400 (Standard)
  const weight = Math.round((strokeWidth / 2.5) * 400);
  
  return (
    <span 
      className={`material-symbols-rounded select-none inline-flex items-center justify-center ${className}`} 
      style={{ 
        fontSize: size, 
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
        width: size,
        height: size
      }}
      {...props}
    >
      {name}
    </span>
  );
};

export const Icons = {
  // Brand
  Logo: ({ 
    size = 24, 
    className = "", 
    variant = "horizontal" 
  }: { 
    size?: number; 
    className?: string; 
    variant?: "horizontal" | "icon" | "white" | "color" | "icon-white" 
  }) => {
    const src = variant === "icon" 
      ? "/images/rubjob-complete_logo-color.png" 
      : variant === "white" 
        ? "/images/rubjob-complete_Text-white.png"
        : variant === "icon-white"
          ? "/images/rubjob-complete_logo-white.png"
          : "/images/rubjob-complete_Text-color.png";
        
    return (
      <div className={`flex items-center ${className}`}>
        <img 
          src={src} 
          alt="Rubjob Logo" 
          style={{ height: size, width: "auto" }}
          className="object-contain"
        />
      </div>
    );
  },

  // Services
  WashFold: (props: IconProps) => <MaterialIcon name="laundry" {...props} />,
  DryClean: (props: IconProps) => <MaterialIcon name="dry_cleaning" {...props} />,
  IronOnly: (props: IconProps) => <MaterialIcon name="iron" {...props} />,
  WashIron: (props: IconProps) => <MaterialIcon name="local_laundry_service" {...props} />,
  DuvetWashing: (props: IconProps) => <MaterialIcon name="bed" {...props} />,

  // Locations
  Home: (props: IconProps) => <MaterialIcon name="home" {...props} />,
  Office: (props: IconProps) => <MaterialIcon name="business" {...props} />,

  // UI
  Back: (props: IconProps) => <MaterialIcon name="arrow_back_ios_new" {...props} />,
  ArrowRight: (props: IconProps) => <MaterialIcon name="arrow_forward" {...props} />,
  ChevronRight: (props: IconProps) => <MaterialIcon name="chevron_right" {...props} />,
  Close: (props: IconProps) => <MaterialIcon name="close" {...props} />,
  Backspace: (props: IconProps) => <MaterialIcon name="backspace" {...props} />,
  Info: (props: IconProps) => <MaterialIcon name="info" {...props} />,
  Alert: (props: IconProps) => <MaterialIcon name="warning" {...props} />,
  AlertCircle: (props: IconProps) => <MaterialIcon name="error_outline" {...props} />,
  Guarantee: (props: IconProps) => <MaterialIcon name="verified_user" {...props} />,
  MapPin: (props: IconProps) => <MaterialIcon name="location_on" {...props} />,
  Payment: (props: IconProps) => <MaterialIcon name="payments" {...props} />,
  Navigation: (props: IconProps) => <MaterialIcon name="navigation" {...props} />,
  Bell: (props: IconProps) => <MaterialIcon name="notifications" {...props} />,
  Edit: (props: IconProps) => <MaterialIcon name="edit" {...props} />,
  Phone: (props: IconProps) => <MaterialIcon name="call" {...props} />,
  User: (props: IconProps) => <MaterialIcon name="person" {...props} />,
  Users: (props: IconProps) => <MaterialIcon name="group" {...props} />,
  Truck: (props: IconProps) => <MaterialIcon name="local_shipping" {...props} />,
  Package: (props: IconProps) => <MaterialIcon name="inventory_2" {...props} />,
  LogOut: (props: IconProps) => <MaterialIcon name="logout" {...props} />,
  Bike: (props: IconProps) => <MaterialIcon name="pedal_bike" {...props} />,
  Star: (props: IconProps) => <MaterialIcon name="star" {...props} />,
  Stars: (props: IconProps) => <MaterialIcon name="grade" {...props} />,
  Globe: (props: IconProps) => <MaterialIcon name="public" {...props} />,
  FileText: (props: IconProps) => <MaterialIcon name="description" {...props} />,
  Clipboard: (props: IconProps) => <MaterialIcon name="content_paste" {...props} />,
  Lock: (props: IconProps) => <MaterialIcon name="lock" {...props} />,
  Shield: (props: IconProps) => <MaterialIcon name="shield" {...props} />,
  DollarSign: (props: IconProps) => <MaterialIcon name="attach_money" {...props} />,
  TrendingUp: (props: IconProps) => <MaterialIcon name="trending_up" {...props} />,
  CreditCard: (props: IconProps) => <MaterialIcon name="credit_card" {...props} />,
  Line: (props: IconProps) => (
    <img 
      src="/images/LINE_logo.png" 
      alt="LINE" 
      style={{ width: props.size || 24, height: props.size || 24 }}
      className={`object-contain ${props.className || ""}`}
    />
  ),
  Facebook: (props: IconProps) => (
    <img 
      src="/images/facebook-logo.webp" 
      alt="Facebook" 
      style={{ width: props.size || 24, height: props.size || 24 }}
      className={`object-contain ${props.className || ""}`}
    />
  ),
  HomeCleaning: (props: IconProps) => <MaterialIcon name="cleaning_services" {...props} />,
  Assistant: (props: IconProps) => <MaterialIcon name="support_agent" {...props} />,
  Companionship: (props: IconProps) => <MaterialIcon name="volunteer_activism" {...props} />,
  Search: (props: IconProps) => <MaterialIcon name="search" {...props} />,
  Clock: (props: IconProps) => <MaterialIcon name="schedule" {...props} />,
  Check: (props: IconProps) => <MaterialIcon name="check" {...props} />,
  Camera: (props: IconProps) => <MaterialIcon name="photo_camera" {...props} />,
  Tasks: (props: IconProps) => <MaterialIcon name="assignment" {...props} />,
  Wallet: (props: IconProps) => <MaterialIcon name="account_balance_wallet" {...props} />,
  UserCog: (props: IconProps) => <MaterialIcon name="manage_accounts" {...props} />,
  Support: (props: IconProps) => <MaterialIcon name="contact_support" {...props} />,
  HelpCircle: (props: IconProps) => <MaterialIcon name="help" {...props} />,
  Ticket: (props: IconProps) => <MaterialIcon name="confirmation_number" {...props} />,
  Percent: (props: IconProps) => <MaterialIcon name="percent" {...props} />,
  Mail: (props: IconProps) => <MaterialIcon name="mail" {...props} />,
  CheckCircle: (props: IconProps) => <MaterialIcon name="check_circle" {...props} />,
  Settings: (props: IconProps) => <MaterialIcon name="settings" {...props} />,
  Store: (props: IconProps) => <MaterialIcon name="store" {...props} />,
  Car: (props: IconProps) => <MaterialIcon name="directions_car" {...props} />,
  Plus: (props: IconProps) => <MaterialIcon name="add" {...props} />,
  Trash: (props: IconProps) => <MaterialIcon name="delete" {...props} />,
  Eye: (props: IconProps) => <MaterialIcon name="visibility" {...props} />,
  Refresh: (props: IconProps) => <MaterialIcon name="refresh" {...props} />,
  Download: (props: IconProps) => <MaterialIcon name="download" {...props} />,
  Loading: ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <div 
      className={`animate-spin rounded-full border-2 border-slate-200 border-t-primary ${className}`} 
      style={{ width: size, height: size }} 
    />
  ),
  ExternalLink: (props: IconProps) => <MaterialIcon name="open_in_new" {...props} />,
  Chat: (props: IconProps) => <MaterialIcon name="chat" {...props} />,
  Finance: (props: IconProps) => <MaterialIcon name="paid" {...props} />,
  Smile: (props: IconProps) => <MaterialIcon name="sentiment_satisfied" {...props} />,
  Lightbulb: (props: IconProps) => <MaterialIcon name="lightbulb" {...props} />,
  Relax: (props: IconProps) => <MaterialIcon name="spa" {...props} />,
  HeartHand: (props: IconProps) => <MaterialIcon name="volunteer_activism" {...props} />,
};

export function IconCircle({ 
  children, 
  variant = "orange", 
  size = "md", 
  className = "" 
}: { 
  children: React.ReactNode; 
  variant?: "orange" | "yellow" | "green" | "white" | "black" | "slate" | "ghost"; 
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const variants = {
    orange: "bg-[#FF9F1C] text-white shadow-[#FF9F1C]/20",
    yellow: "bg-[#ffce00] text-slate-900 shadow-[#ffce00]/20",
    green:  "bg-[#10B981] text-white shadow-[#10B981]/20",
    white:  "bg-white text-slate-900 border border-slate-100 shadow-slate-200/50",
    black:  "bg-[#1a1a1a] text-white shadow-black/20",
    slate:  "bg-slate-100 text-slate-500",
    ghost:  "bg-transparent text-slate-900 shadow-none",
  };

  const sizes = {
    xs: "w-7 h-7 rounded-lg text-sm",
    sm: "w-10 h-10 rounded-xl text-lg",
    md: "w-14 h-14 rounded-2xl text-2xl",
    lg: "w-16 h-16 rounded-[1.5rem] text-3xl",
    xl: "w-20 h-20 rounded-[2rem] text-4xl",
  };

  return (
    <div className={`flex items-center justify-center shrink-0 shadow-lg ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </div>
  );
}

export function getServiceIcon(id: string, props: IconProps = {}) {
  switch (id) {
    case "wash_fold": return <Icons.WashFold {...props} />;
    case "dry_clean": return <Icons.DryClean {...props} />;
    case "iron_only": return <Icons.IronOnly {...props} />;
    case "wash_iron": return <Icons.WashIron {...props} />;
    case "duvet_washing": return <Icons.DuvetWashing {...props} />;
    case "home_cleaning": return <Icons.HomeCleaning {...props} />;
    case "personal_assistant": return <Icons.Assistant {...props} />;
    case "companionship": return <Icons.Companionship {...props} />;
    default: return <Icons.WashFold {...props} />;
  }
}
