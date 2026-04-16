import { KpiCard } from "./KpiCard"
import { RankingLigas, type RankingItem } from "./RankingLigas"

// ─── mock data ────────────────────────────────────────────────────────────────

const METRICAS_MEMBRO = [
  { label: "Meu score",              valor: "72 pts",    trend: "↑ +5pts",   trendType: "up"      as const },
  { label: "Minha frequência",       valor: "87%",       trend: "↑ +2%",     trendType: "up"      as const },
  { label: "Projetos que participo", valor: "2",         trend: "↔ estável", trendType: "neutral" as const },
  { label: "Próxima reunião",        valor: "Sex 18/04", trend: "às 19h",    trendType: "neutral" as const },
]

const RANKING_MEMBRO: RankingItem[] = [
  { id: "r1", nome: "Liga Tech",    score: 840, minhaLiga: true  },
  { id: "r2", nome: "Link Finance", score: 710, minhaLiga: false },
  { id: "r3", nome: "Marketing",    score: 620, minhaLiga: false },
  { id: "r4", nome: "RH",           score: 480, minhaLiga: false },
]

// ─── component ────────────────────────────────────────────────────────────────

export function HomeMembroView() {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Meu Desempenho
        </p>
        <div className="grid grid-cols-4 gap-3">
          {METRICAS_MEMBRO.map((m) => (
            <KpiCard
              key={m.label}
              label={m.label}
              value={m.valor}
              trend={m.trend}
              trendType={m.trendType}
            />
          ))}
        </div>
      </div>

      {/* Ranking geral */}
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Ranking Geral
        </p>
        <RankingLigas ranking={RANKING_MEMBRO} />
      </div>
    </div>
  )
}
