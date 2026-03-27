import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type Variant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  default: "bg-[#EAEAEA] text-[#10284E]",
  success: "bg-green-100 text-green-800",
  warning: "bg-[#FEC641]/20 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-[#546484]/15 text-[#10284E]",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
          variantClasses[variant],
          className
        )
      )}
    >
      {children}
    </span>
  );
}
