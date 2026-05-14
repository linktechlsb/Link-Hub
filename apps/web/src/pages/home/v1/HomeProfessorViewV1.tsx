import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { cn } from "@/lib/utils";

import { EditorialTable, KpiRow, SectionHeader } from "./primitives";

import type { Evento, Liga, Projeto, RankingLiga } from "@link-leagues/types";

interface HomeProfessorViewV1Props {
  minhaLiga: Liga;
  ranking: RankingLiga[];
}

const diasDesde = (iso: string): number => {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

function statusLabel(dias: number) {
  if (dias > 7) return "Urgente";
  if (dias >= 4) return "Atenção";
  return "Aguardando";
}

export function HomeProfessorViewV1({ minhaLiga, ranking }: HomeProfessorViewV1Props) {
  const navigate = useNavigate();

  const hojeIso = new Date().toISOString().slice(0, 10);
  const { data: projetosData } = useCachedFetch<Projeto[]>(`/api/projetos?liga_id=${minhaLiga.id}`);
  const { data: eventosData } = useCachedFetch<Evento[]>(
    `/api/eventos?liga_id=${minhaLiga.id}&inicio=${hojeIso}`,
  );

  const projetos = projetosData ?? [];
  const eventos = (eventosData ?? []).slice(0, 5);

  const rankingMinha = ranking.find((r) => r.liga_id === minhaLiga.id) ?? null;

  const metricas = [
    { label: "Score", valor: String(rankingMinha?.pontuacao ?? 0), unidade: "pts" },
    { label: "Projetos ativos", valor: String(rankingMinha?.projetos_em_andamento ?? 0) },
    { label: "Membros", valor: String(minhaLiga.total_membros ?? 0) },
    { label: "Presenças", valor: String(rankingMinha?.presencas ?? 0) },
  ];

  const fila = projetos
    .filter((p) => p.aprovacao_professor === "pendente" && p.status === "em_aprovacao")
    .map((p) => ({
      id: p.id,
      nome: p.titulo,
      diasAguardando: diasDesde(p.criado_em),
    }));

  return (
    <div className="space-y-6">
      <section>
        <SectionHeader titulo="Indicadores da Liga" />
        <KpiRow items={metricas} />
      </section>

      <section>
        <SectionHeader
          titulo="Fila de Aprovação"
          acao={
            <button
              onClick={() => navigate("/projetos")}
              className="text-xs font-semibold text-link-blue hover:underline"
            >
              Ver todos →
            </button>
          }
        />
        {fila.length === 0 ? (
          <Card className="shadow-sm">
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              Nenhum projeto aguardando sua aprovação.
            </div>
          </Card>
        ) : (
          <EditorialTable
            columns={["Projeto", "Aguardando", "Status", "Ação"]}
            rows={fila.map((p) => [
              <span key="nome" className="font-semibold text-foreground">
                {p.nome}
              </span>,
              <span key="dias" className="text-xs text-muted-foreground">
                {String(p.diasAguardando).padStart(2, "0")} dia{p.diasAguardando !== 1 ? "s" : ""}
              </span>,
              <Badge
                key="status"
                variant="outline"
                className={cn(
                  "text-[10px]",
                  p.diasAguardando > 7
                    ? "border-red-800/40 text-red-400"
                    : p.diasAguardando >= 4
                      ? "border-amber-700/40 text-amber-400"
                      : "border-foreground/20 text-foreground/50",
                )}
              >
                {statusLabel(p.diasAguardando)}
              </Badge>,
              <Button
                key="cta"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => navigate("/projetos")}
              >
                Revisar
              </Button>,
            ])}
          />
        )}
      </section>

      <section>
        <SectionHeader titulo="Próximos Eventos" />
        {eventos.length === 0 ? (
          <Card className="shadow-sm">
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              Sem eventos programados.
            </div>
          </Card>
        ) : (
          <Card className="shadow-sm overflow-hidden">
            <ul>
              {eventos.map((e) => {
                const data = new Date(e.data);
                const dataFmt = data.toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                });
                return (
                  <li
                    key={e.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-[#191919] last:border-b-0"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {dataFmt}
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{e.titulo}</p>
                    </div>
                    {e.hora_inicio && (
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        {e.hora_inicio.slice(0, 5)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
