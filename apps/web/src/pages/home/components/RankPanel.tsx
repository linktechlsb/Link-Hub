import { Skeleton } from "@/components/ui/skeleton";

import { DashboardCard } from "./DashboardCard";

/**
 * Painel de ranking: título, destaque (#1), barra empilhada,
 * legenda e tabela (Domínio / Share / Total). Tudo em skeleton.
 */
export function RankPanel() {
  return (
    <DashboardCard className="flex flex-col gap-5 p-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-3 w-24 bg-white/5" />
        <Skeleton className="h-7 w-12 bg-white/5" />
      </div>

      {/* Barra empilhada + legenda */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-2.5 w-full rounded-full bg-white/[0.03]" />
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Skeleton className="h-2 w-2 rounded-full bg-white/5" />
              <Skeleton className="h-2.5 w-12 bg-white/5" />
            </div>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="flex flex-col gap-1">
        {/* Cabeçalho da tabela */}
        <div className="flex items-center justify-between py-2">
          <Skeleton className="h-2.5 w-16 bg-white/5" />
          <div className="flex gap-10">
            <Skeleton className="h-2.5 w-10 bg-white/5" />
            <Skeleton className="h-2.5 w-10 bg-white/5" />
          </div>
        </div>
        {/* Linhas */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-sm bg-white/5" />
              <Skeleton className="h-3 w-20 bg-white/5" />
            </div>
            <div className="flex gap-10">
              <Skeleton className="h-3 w-8 bg-white/5" />
              <Skeleton className="h-3 w-8 bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
