import { AlertTriangle, MapPin } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { KpiCard } from "./KpiCard";
import { RankingLigas, type RankingItem } from "./RankingLigas";

// ─── mock data ────────────────────────────────────────────────────────────────

const METRICAS_MINHA_LIGA = [
  { label: "Projetos ativos", valor: "3", trend: "↑ +1", trendType: "up" as const },
  { label: "Receita", valor: "R$ 2.000", trend: "↑ este mês", trendType: "up" as const },
  { label: "Membros", valor: "24", trend: "↔ estável", trendType: "neutral" as const },
  { label: "Score", valor: "840 pts", trend: "↑ +12pts", trendType: "up" as const },
];

const METRICAS_GLOBAL = [
  { label: "Projetos ativos", valor: "12", trend: "↑ +3", trendType: "up" as const },
  { label: "Receita total", valor: "R$ 8.700", trend: "↑ este mês", trendType: "up" as const },
  { label: "Membros", valor: "94", trend: "↑ +5", trendType: "up" as const },
  { label: "Score médio", valor: "663 pts", trend: "↔ estável", trendType: "neutral" as const },
];

const ALERTAS_MOCK = [
  { id: "a1", projeto: "App de presenças", motivo: "recusado pelo professor" },
  { id: "a2", projeto: "Dashboard financeiro", motivo: "aguardando Staff há 3 dias" },
];

const SALA_MOCK = { sala: "Sala 204", data: "Sex 18/04", horario: "19h" };

const RANKING_MOCK: RankingItem[] = [
  { id: "r1", nome: "Liga Tech", score: 840, minhaLiga: true },
  { id: "r2", nome: "Link Finance", score: 710, minhaLiga: false },
  { id: "r3", nome: "Marketing", score: 620, minhaLiga: false },
  { id: "r4", nome: "RH", score: 480, minhaLiga: false },
];

// ─── component ────────────────────────────────────────────────────────────────

export function HomeDiretorView() {
  const navigate = useNavigate();
  const [visao, setVisao] = useState<"minha" | "global">("minha");

  const metricas = visao === "minha" ? METRICAS_MINHA_LIGA : METRICAS_GLOBAL;

  return (
    <div className="space-y-6">
      {/* Toggle Minha Liga / Visão Global */}
      <Tabs
        value={visao}
        onValueChange={(v) => setVisao(v as "minha" | "global")}
        className="w-fit"
      >
        <TabsList>
          <TabsTrigger value="minha">Minha Liga</TabsTrigger>
          <TabsTrigger value="global">Visão Global</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-3">
        {metricas.map((m) => (
          <KpiCard
            key={m.label}
            label={m.label}
            value={m.valor}
            trend={m.trend}
            trendType={m.trendType}
          />
        ))}
      </div>

      {/* Alertas — apenas "Minha Liga" */}
      {visao === "minha" && ALERTAS_MOCK.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
              Ação Necessária
            </p>
            <button
              onClick={() => navigate("/projetos")}
              className="text-xs text-link-blue font-semibold hover:underline"
            >
              Ver todos
            </button>
          </div>
          <div className="space-y-2">
            {ALERTAS_MOCK.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate("/projetos")}
                className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 hover:bg-amber-100 transition-colors shadow-sm"
              >
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-navy">{a.projeto}</p>
                  <p className="text-xs text-amber-700 mt-0.5 first-letter:uppercase">{a.motivo}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Próxima sala reservada — apenas "Minha Liga" */}
      {visao === "minha" && SALA_MOCK && (
        <div>
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
            Próxima Sala Reservada
          </p>
          <Card className="shadow-sm">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg border border-border flex items-center justify-center font-bold text-sm text-navy bg-slate-50 shrink-0">
                {SALA_MOCK.sala.replace("Sala ", "")}
              </div>
              <div>
                <p className="text-sm font-semibold text-navy flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {SALA_MOCK.sala}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {SALA_MOCK.data} às {SALA_MOCK.horario}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ranking geral — sempre visível */}
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Ranking Geral
        </p>
        <RankingLigas ranking={RANKING_MOCK} />
      </div>
    </div>
  );
}
