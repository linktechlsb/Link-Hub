import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
 * Bordas divisórias da célula: grade 2×2 no mobile, 1×4 a partir de md.
 * No mobile, colunas pares levam borda à esquerda e a segunda linha leva
 * borda superior; em md todas menos a primeira levam borda à esquerda.
 */
function cellBorders(i: number): string {
  return cn(
    i % 2 === 1 && "border-l border-border",
    i >= 2 && "border-t border-border md:border-t-0",
    i > 0 && "md:border-l md:border-border",
  );
}

/**
 * Faixa superior com 4 KPIs, divididos por linhas.
 * Recebe os indicadores já calculados por papel; mostra skeleton em loading.
 */
export function KpiStrip({ items, loading = false }: KpiStripProps) {
  if (loading) {
    return (
      <DashboardCard>
        <div className="grid grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn("flex flex-col gap-4 p-5", cellBorders(i))}>
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
      <div className="grid grid-cols-2 md:grid-cols-4">
        {items.map(({ icon: Icon, label, value }, i) => (
          <div key={label} className={cn("flex flex-col gap-4 p-5", cellBorders(i))}>
            <div className="flex items-center gap-2 text-foreground/60">
              <Icon className="h-4 w-4" aria-hidden />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <span className="font-display text-3xl font-bold text-foreground">{value}</span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
