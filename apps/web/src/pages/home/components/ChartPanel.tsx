import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { DashboardCard } from "./DashboardCard";

interface ChartPanelProps {
  /** Altura da área do gráfico (skeleton). */
  chartClassName?: string;
  /** Classes extras do card (ex.: h-full para preencher a coluna). */
  className?: string;
}

/**
 * Painel com título, número de destaque, variação e área de gráfico.
 * Usado para "Unique Visitors", "AI Visibility Score", "AI Referral Visits".
 * Tudo em skeleton até plugarmos os dados.
 */
export function ChartPanel({ chartClassName = "h-56", className }: ChartPanelProps) {
  return (
    <DashboardCard className={cn("flex flex-col gap-5 p-5", className)}>
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-3 w-28 bg-white/5" />
        <Skeleton className="h-7 w-24 bg-white/5" />
        <Skeleton className="h-3 w-32 bg-white/5" />
      </div>
      {/* Área do gráfico */}
      <Skeleton className={cn("w-full rounded-lg bg-white/[0.03]", chartClassName)} />
    </DashboardCard>
  );
}
