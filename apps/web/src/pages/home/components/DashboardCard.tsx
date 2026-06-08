import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Container base do dashboard.
 * Usa tokens semânticos (bg-card / border) para seguir o tema light/dark.
 */
export const DashboardCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-xl border border-border bg-card", className)}
      {...props}
    />
  ),
);
DashboardCard.displayName = "DashboardCard";
