import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Container base do dashboard.
 * Cores fixas do design: fundo #1F1F1F, borda #2D2D2D.
 */
export const DashboardCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-xl border border-[#2D2D2D] bg-[#1F1F1F]", className)}
      {...props}
    />
  ),
);
DashboardCard.displayName = "DashboardCard";
