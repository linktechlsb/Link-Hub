import { useNavigate } from "react-router-dom";

import { useCachedFetch } from "@/hooks/use-cached-fetch";

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
    <div className="space-y-12">
      <section>
        <SectionHeader numero="01" eyebrow="Métricas da liga" titulo="Indicadores atuais" />
        <KpiRow items={metricas} />
      </section>

      <section>
        <SectionHeader
          numero="02"
          eyebrow="Fila de aprovação"
          titulo="Projetos aguardando revisão"
          acao={
            <button
              onClick={() => navigate("/projetos")}
              className="font-plex-mono text-[10px] uppercase tracking-[0.2em] text-navy border-b border-navy pb-0.5"
            >
              Ver todos →
            </button>
          }
        />
        {fila.length === 0 ? (
          <div className="border-t border-b border-navy/15 py-6 text-center font-plex-sans text-[13px] text-navy/60">
            Nenhum projeto aguardando sua aprovação.
          </div>
        ) : (
          <EditorialTable
            columns={["Projeto", "Aguardando", "Status", "Ação"]}
            rows={fila.map((p) => [
              <span key="nome" className="font-semibold">
                {p.nome}
              </span>,
              <span key="dias" className="font-plex-mono text-[11px] text-navy/70">
                {String(p.diasAguardando).padStart(2, "0")} dia{p.diasAguardando !== 1 ? "s" : ""}
              </span>,
              <span
                key="status"
                className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy border border-navy px-2 py-1"
              >
                {statusLabel(p.diasAguardando)}
              </span>,
              <button
                key="cta"
                onClick={() => navigate("/projetos")}
                className="font-plex-mono text-[10px] uppercase tracking-[0.2em] text-navy border-b border-navy pb-0.5"
              >
                Revisar →
              </button>,
            ])}
          />
        )}
      </section>

      <section>
        <SectionHeader numero="03" eyebrow="Agenda" titulo="Próximos eventos da liga" />
        {eventos.length === 0 ? (
          <div className="border-t border-b border-navy/15 py-6 text-center font-plex-sans text-[13px] text-navy/60">
            Sem eventos programados.
          </div>
        ) : (
          <ul className="border-t border-navy/15">
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
                  className="border-b border-navy/15 py-4 flex items-baseline justify-between"
                >
                  <div>
                    <div className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/60">
                      {dataFmt}
                    </div>
                    <div className="font-plex-sans font-semibold text-[15px] text-navy mt-1">
                      {e.titulo}
                    </div>
                  </div>
                  {e.hora_inicio && (
                    <span className="font-plex-sans font-bold text-[18px] text-navy tracking-[-0.02em]">
                      {e.hora_inicio.slice(0, 5)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
