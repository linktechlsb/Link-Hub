import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useCachedFetch } from "@/hooks/use-cached-fetch";

import {
  AlertList,
  KpiRow,
  RankingList,
  SectionHeader,
  type AlertV1Item,
  type RankingV1Item,
} from "./primitives";

import type { Evento, Liga, Projeto, RankingLiga, Sala } from "@link-leagues/types";

interface HomeDiretorViewV1Props {
  minhaLiga: Liga;
  ligas: Liga[];
  ranking: RankingLiga[];
}

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const diasDesde = (iso: string): number => {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

export function HomeDiretorViewV1({ minhaLiga, ligas, ranking }: HomeDiretorViewV1Props) {
  const navigate = useNavigate();
  const [visao, setVisao] = useState<"minha" | "global">("minha");

  const { data: projetosData } = useCachedFetch<Projeto[]>(`/api/projetos?liga_id=${minhaLiga.id}`);
  const { data: proximoEvento } = useCachedFetch<Evento>(
    `/api/ligas/${minhaLiga.id}/eventos/proximo`,
  );
  const { data: salasData } = useCachedFetch<Sala[]>(proximoEvento?.sala_id ? `/api/salas` : null);

  const projetos = projetosData ?? [];
  const sala = salasData?.find((s) => s.id === proximoEvento?.sala_id) ?? null;

  const rankingMinha = ranking.find((r) => r.liga_id === minhaLiga.id) ?? null;
  const ligaInfo = ligas.find((l) => l.id === minhaLiga.id) ?? null;

  const metricasMinha = [
    {
      label: "Projetos ativos",
      valor: String(rankingMinha?.projetos_em_andamento ?? ligaInfo?.projetos_ativos ?? 0),
    },
    { label: "Receita", valor: formatarMoeda(Number(rankingMinha?.receita_total ?? 0)) },
    { label: "Membros", valor: String(ligaInfo?.total_membros ?? 0) },
    { label: "Score", valor: String(rankingMinha?.pontuacao ?? 0), unidade: "pts" },
  ];

  const totalMembros = ligas.reduce((acc, l) => acc + (l.total_membros ?? 0), 0);
  const totalProjetos = ranking.reduce((acc, r) => acc + (r.projetos_em_andamento ?? 0), 0);
  const totalReceita = ranking.reduce((acc, r) => acc + Number(r.receita_total ?? 0), 0);
  const scoreMedio = ranking.length
    ? Math.round(ranking.reduce((acc, r) => acc + (r.pontuacao ?? 0), 0) / ranking.length)
    : 0;

  const metricasGlobal = [
    { label: "Projetos ativos", valor: String(totalProjetos) },
    { label: "Receita total", valor: formatarMoeda(totalReceita) },
    { label: "Membros", valor: String(totalMembros) },
    { label: "Score médio", valor: String(scoreMedio), unidade: "pts" },
  ];

  const metricas = visao === "minha" ? metricasMinha : metricasGlobal;

  const alertas: AlertV1Item[] = projetos
    .filter((p) => {
      if (p.status === "rejeitado") return true;
      if (p.status === "em_aprovacao" && diasDesde(p.criado_em) > 3) return true;
      return false;
    })
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      titulo: p.titulo,
      descricao:
        p.status === "rejeitado"
          ? "Projeto rejeitado"
          : `Aguardando aprovação há ${diasDesde(p.criado_em)} dias`,
      tipo: p.status === "rejeitado" ? "urgente" : "atencao",
    }));

  const rankingItems: RankingV1Item[] = ranking.map((r) => ({
    id: r.liga_id,
    nome: r.nome,
    score: r.pontuacao,
    destaque: r.liga_id === minhaLiga.id,
  }));

  const mostrarSala = visao === "minha" && proximoEvento && sala && proximoEvento.hora_inicio;
  const dataEvento = proximoEvento ? new Date(proximoEvento.data) : null;
  const dataFmt = dataEvento
    ? dataEvento.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
    : "";

  let secao = 1;

  return (
    <div className="space-y-12">
      <section>
        <SectionHeader
          numero={String(secao++).padStart(2, "0")}
          eyebrow={`Visão · ${visao === "minha" ? "Minha liga" : "Global"}`}
          titulo="Métricas da operação"
          acao={
            <div className="flex gap-0 font-plex-mono">
              <button
                onClick={() => setVisao("minha")}
                className={`px-4 py-2 text-[10px] uppercase tracking-[0.18em] border border-navy transition-colors ${
                  visao === "minha" ? "bg-navy text-white" : "text-navy"
                }`}
              >
                Minha
              </button>
              <button
                onClick={() => setVisao("global")}
                className={`px-4 py-2 text-[10px] uppercase tracking-[0.18em] border border-navy border-l-0 transition-colors ${
                  visao === "global" ? "bg-navy text-white" : "text-navy"
                }`}
              >
                Global
              </button>
            </div>
          }
        />
        <KpiRow items={metricas} />
      </section>

      {visao === "minha" && alertas.length > 0 && (
        <section>
          <SectionHeader
            numero={String(secao++).padStart(2, "0")}
            eyebrow="Ação necessária"
            titulo="Projetos com pendência"
            acao={
              <button
                onClick={() => navigate("/projetos")}
                className="font-plex-mono text-[10px] uppercase tracking-[0.2em] text-navy border-b border-navy pb-0.5"
              >
                Ver todos →
              </button>
            }
          />
          <AlertList items={alertas} onClick={() => navigate("/projetos")} />
        </section>
      )}

      {mostrarSala && (
        <section>
          <SectionHeader
            numero={String(secao++).padStart(2, "0")}
            eyebrow="Próxima reserva"
            titulo="Sala agendada"
          />
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-6">
            <div className="w-14 h-14 border border-navy flex items-center justify-center font-plex-sans font-bold text-[18px] text-navy">
              {sala.nome.replace(/[^0-9]/g, "") || sala.nome.slice(0, 3)}
            </div>
            <div>
              <div className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/60">
                Localização
              </div>
              <div className="font-plex-sans font-semibold text-[15px] text-navy mt-1">
                {sala.nome}
              </div>
            </div>
            <div className="text-right">
              <div className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/60">
                Quando
              </div>
              <div className="font-plex-sans font-semibold text-[15px] text-navy mt-1">
                {dataFmt} · {proximoEvento.hora_inicio?.slice(0, 5)}
              </div>
            </div>
          </div>
        </section>
      )}

      {rankingItems.length > 0 && (
        <section>
          <SectionHeader
            numero={String(secao++).padStart(2, "0")}
            eyebrow="Ranking geral"
            titulo="Pontuação das ligas"
          />
          <RankingList items={rankingItems} />
        </section>
      )}
    </div>
  );
}
