import { Trophy } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export interface RankingItem {
  id: string
  nome: string
  score: number
  minhaLiga: boolean
}

interface RankingLigasProps {
  ranking: RankingItem[]
}

export function RankingLigas({ ranking }: RankingLigasProps) {
  const maxScore = Math.max(...ranking.map((r) => r.score), 1)

  return (
    <Card className="overflow-hidden shadow-sm">
      {ranking.map((r, i) => (
        <div
          key={r.id}
          className={cn(
            "flex items-center gap-3 px-4 py-3",
            i < ranking.length - 1 && "border-b border-border",
            r.minhaLiga && "bg-navy/5"
          )}
        >
          <span
            className={cn(
              "text-xs font-bold w-5 text-center shrink-0",
              r.minhaLiga ? "text-navy" : "text-muted-foreground"
            )}
          >
            {i + 1}º
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={cn(
                  "text-sm font-semibold truncate",
                  r.minhaLiga ? "text-navy" : "text-slate-700"
                )}
              >
                {r.nome}
                {r.minhaLiga && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold bg-navy text-white px-1.5 py-0.5 rounded-full align-middle">
                    <Trophy className="h-2.5 w-2.5" />
                    minha
                  </span>
                )}
              </span>
              <span className="text-xs font-bold text-navy/70 ml-3 shrink-0">
                {r.score} pts
              </span>
            </div>
            <Progress
              value={Math.round((r.score / maxScore) * 100)}
              className={cn(
                "h-1.5",
                r.minhaLiga ? "[&>div]:bg-navy" : "[&>div]:bg-slate-300"
              )}
            />
          </div>
        </div>
      ))}
    </Card>
  )
}
