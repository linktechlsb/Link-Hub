import { Skeleton } from "@/components/ui/skeleton";

import { DashboardCard } from "./DashboardCard";

import type { LucideIcon } from "lucide-react";

export interface KpiItem {
  icon: LucideIcon;
  label: string;
  value: string;
}

interface KpiStripProps {
  items: KpiItem[];
  loading?: boolean;
}

/**
 * Faixa superior com 4 KPIs, divididos por linhas verticais.
 * Recebe os indicadores já calculados por papel; mostra skeleton em loading.
 */
export function KpiStrip({ items, loading = false }: KpiStripProps) {
  if (loading) {
    return (
      <DashboardCard>
        <div className="grid grid-cols-4 divide-x divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-sm bg-foreground/5" />
                <Skeleton className="h-3 w-20 bg-foreground/5" />
              </div>
              <Skeleton className="h-8 w-16 bg-foreground/5" />
            </div>
          ))}
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard>
      <div className="grid grid-cols-4 divide-x divide-border">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2 text-foreground/50">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <span className="font-display text-3xl font-bold text-foreground">{value}</span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
