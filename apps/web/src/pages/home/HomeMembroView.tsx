import { useCachedFetch } from "@/hooks/use-cached-fetch";

import { KpiCard } from "./KpiCard";
import { RankingLigas, type RankingItem } from "./RankingLigas";

import type { Evento, Liga, Projeto, RankingLiga } from "@link-leagues/types";

interface HomeMembroViewProps {
  minhaLiga: Liga;
  ranking: RankingLiga[];
  usuarioId: string | null;
}

function formatarProximoEvento(evento: Evento | null): string {
  if (!evento) return "—";
  const data = new Date(evento.data);
  const dataStr = data.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  return evento.hora_inicio ? `${dataStr} às ${evento.hora_inicio.slice(0, 5)}` : dataStr;
}

export function HomeMembroView({ minhaLiga, ranking, usuarioId }: HomeMembroViewProps) {
  const { data: projetosData } = useCachedFetch<Projeto[]>(`/api/projetos?liga_id=${minhaLiga.id}`);
  const { data: proximoEvento } = useCachedFetch<Evento>(
    `/api/ligas/${minhaLiga.id}/eventos/proximo`,
  );

  const projetos = projetosData ?? [];
  const meusProjetos = usuarioId
    ? projetos.filter(
        (p) =>
          p.responsavel_id === usuarioId &&
          p.status !== "rascunho" &&
          p.status !== "rejeitado" &&
          p.status !== "cancelado",
      )
    : [];

  const metricas = [
    { label: "Meu score", valor: "—" },
    { label: "Minha frequência", valor: "—" },
    { label: "Projetos que participo", valor: String(meusProjetos.length) },
    { label: "Próxima reunião", valor: formatarProximoEvento(proximoEvento ?? null) },
  ];

  const rankingItems: RankingItem[] = ranking.map((r) => ({
    id: r.liga_id,
    nome: r.nome,
    score: r.pontuacao,
    minhaLiga: r.liga_id === minhaLiga.id,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Meu Desempenho
        </p>
        <div className="grid grid-cols-4 gap-3">
          {metricas.map((m) => (
            <KpiCard key={m.label} label={m.label} value={m.valor} trendType="neutral" />
          ))}
        </div>
      </div>

      {rankingItems.length > 0 && (
        <div>
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
            Ranking Geral
          </p>
          <RankingLigas ranking={rankingItems} />
        </div>
      )}
    </div>
  );
}
