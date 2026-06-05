import { Trophy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { RankingLiga } from "@link-leagues/types";

interface RankingLigasCardProps {
  ranking: RankingLiga[];
  minhaLigaId?: string | null;
  loading?: boolean;
}

function medalLabel(posicao: number): string {
  return `${posicao}º`;
}

function posicaoClass(posicao: number): string {
  if (posicao === 1) return "text-brand-yellow font-bold text-sm";
  if (posicao === 2) return "text-slate-400 font-bold text-xs";
  if (posicao === 3) return "text-amber-700/80 dark:text-amber-600 font-bold text-xs";
  return "text-muted-foreground/50 text-xs";
}

function progressClass(posicao: number, isMinha: boolean): string {
  if (posicao === 1)
    return "[&>div]:bg-gradient-to-r [&>div]:from-brand-yellow [&>div]:to-amber-400";
  if (posicao === 2) return "[&>div]:bg-slate-400";
  if (isMinha) return "[&>div]:bg-navy dark:[&>div]:bg-white/40";
  return "[&>div]:bg-foreground/20";
}

export function RankingLigasCard({ ranking, minhaLigaId, loading = false }: RankingLigasCardProps) {
  const sorted = [...ranking].sort((a, b) => (b.pontuacao ?? 0) - (a.pontuacao ?? 0));
  const maxScore = Math.max(...sorted.map((r) => r.pontuacao ?? 0), 1);

  return (
    <Card className="shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] dark:bg-white/[0.025] dark:border-white/[0.06] h-full flex flex-col">
      <CardContent className="pt-5 pb-3 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-sm text-navy dark:text-foreground">Ranking das Ligas</p>
          <Trophy className="h-4 w-4 text-brand-yellow" />
        </div>

        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={cn("py-2.5", i < 4 && "border-b border-border dark:border-white/[0.04]")}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Skeleton className="h-3 w-5 shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-3 w-12 shrink-0" />
                </div>
                <div className="pl-7">
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Nenhum dado de ranking</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-0 -mr-1 pr-1">
            {sorted.map((r, i) => {
              const posicao = i + 1;
              const isMinha = r.liga_id === minhaLigaId;
              const pct = Math.round(((r.pontuacao ?? 0) / maxScore) * 100);

              return (
                <div
                  key={r.liga_id}
                  className={cn(
                    "py-2.5",
                    i < sorted.length - 1 && "border-b border-border dark:border-white/[0.04]",
                    isMinha && "dark:bg-brand-yellow/[0.04] -mx-1 px-1 rounded-md",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={cn("w-5 shrink-0 text-center leading-none", posicaoClass(posicao))}
                    >
                      {medalLabel(posicao)}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold flex-1 truncate",
                        isMinha ? "text-navy dark:text-brand-yellow/90" : "text-foreground",
                      )}
                    >
                      {r.nome}
                    </span>
                    {isMinha && <span className="minha-badge">Minha</span>}
                    <span
                      className={cn(
                        "text-xs font-bold shrink-0",
                        posicao === 1 ? "text-brand-yellow" : "text-foreground/50",
                      )}
                    >
                      {(r.pontuacao ?? 0).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="pl-7">
                    <Progress
                      value={pct}
                      className={cn("h-1.5 rounded-full", progressClass(posicao, isMinha))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
