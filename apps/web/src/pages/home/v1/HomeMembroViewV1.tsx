import { useCachedFetch } from "@/hooks/use-cached-fetch";

import { SectionHeader, KpiRow, RankingList, type RankingV1Item } from "./primitives";

import type { Evento, Liga, Projeto, RankingLiga } from "@link-leagues/types";

interface HomeMembroViewV1Props {
  minhaLiga: Liga;
  ranking: RankingLiga[];
  usuarioId: string | null;
}

function formatarDataEvento(evento: Evento | null): { valor: string; trend: string } {
  if (!evento) return { valor: "—", trend: "" };
  const data = new Date(evento.data);
  const valor = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const trend = evento.hora_inicio ? evento.hora_inicio.slice(0, 5) : "";
  return { valor, trend };
}

export function HomeMembroViewV1({ minhaLiga, ranking, usuarioId }: HomeMembroViewV1Props) {
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

  const evento = formatarDataEvento(proximoEvento ?? null);

  const metricas = [
    { label: "Meu score", valor: "—", unidade: "pts" },
    { label: "Minha frequência", valor: "—", unidade: "%" },
    { label: "Projetos", valor: String(meusProjetos.length), unidade: "" },
    { label: "Próxima reunião", valor: evento.valor, unidade: "", trend: evento.trend },
  ];

  const rankingItems: RankingV1Item[] = ranking.map((r) => ({
    id: r.liga_id,
    nome: r.nome,
    score: r.pontuacao,
    destaque: r.liga_id === minhaLiga.id,
  }));

  return (
    <div className="space-y-12">
      <section>
        <SectionHeader numero="01" eyebrow="Meu desempenho" titulo="Performance pessoal" />
        <KpiRow items={metricas} />
      </section>

      {rankingItems.length > 0 && (
        <section>
          <SectionHeader numero="02" eyebrow="Ranking geral" titulo="Onde sua liga está" />
          <RankingList items={rankingItems} />
        </section>
      )}
    </div>
  );
}
