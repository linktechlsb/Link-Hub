import { Trophy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import type { RankingLiga } from "@link-leagues/types";

interface RankingLigasCardProps {
  ranking: RankingLiga[];
  minhaLigaId?: string | null;
}

function corPosicao(posicao: number): string {
  if (posicao === 1) return "text-brand-yellow font-bold";
  if (posicao === 2) return "text-link-blue font-bold";
  if (posicao === 3) return "text-navy/50 font-bold";
  return "text-muted-foreground";
}

export function RankingLigasCard({ ranking, minhaLigaId }: RankingLigasCardProps) {
  const sorted = [...ranking].sort((a, b) => (b.pontuacao ?? 0) - (a.pontuacao ?? 0));
  const maxScore = Math.max(...sorted.map((r) => r.pontuacao ?? 0), 1);

  return (
    <Card className="shadow-sm h-full flex flex-col">
      <CardContent className="pt-5 pb-3 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-sm text-navy">Ranking das Ligas</p>
          <Trophy className="h-4 w-4 text-brand-yellow" />
        </div>

        {sorted.length === 0 ? (
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
                    i < sorted.length - 1 && "border-b border-border",
                    isMinha && "bg-navy/[0.03] -mx-1 px-1 rounded",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn("text-xs w-5 shrink-0 text-center", corPosicao(posicao))}>
                      {posicao}º
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold flex-1 truncate",
                        isMinha ? "text-navy" : "text-foreground",
                      )}
                    >
                      {r.nome}
                    </span>
                    {isMinha && (
                      <span className="text-[9px] bg-navy text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">
                        Minha
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-xs font-bold shrink-0",
                        posicao === 1 ? "text-brand-yellow" : "text-navy/70",
                      )}
                    >
                      {(r.pontuacao ?? 0).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="pl-7">
                    <Progress
                      value={pct}
                      className={cn(
                        "h-1",
                        posicao === 1
                          ? "[&>div]:bg-brand-yellow"
                          : posicao === 2
                            ? "[&>div]:bg-link-blue"
                            : isMinha
                              ? "[&>div]:bg-navy"
                              : "[&>div]:bg-foreground/20",
                      )}
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
