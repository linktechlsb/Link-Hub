import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  AlertList,
  KpiRow,
  RankingList,
  SectionHeader,
  type AlertV1Item,
  type RankingV1Item,
} from "./primitives";

const METRICAS_MINHA = [
  { label: "Projetos ativos", valor: "3", trend: "↑ +1" },
  { label: "Receita", valor: "R$ 2.000", trend: "Este mês" },
  { label: "Membros", valor: "24", trend: "Estável" },
  { label: "Score", valor: "840", unidade: "pts", trend: "↑ +12pts" },
];

const METRICAS_GLOBAL = [
  { label: "Projetos ativos", valor: "12", trend: "↑ +3" },
  { label: "Receita total", valor: "R$ 8.700", trend: "Este mês" },
  { label: "Membros", valor: "94", trend: "↑ +5" },
  { label: "Score médio", valor: "663", unidade: "pts", trend: "Estável" },
];

const ALERTAS: AlertV1Item[] = [
  { id: "a1", titulo: "App de presenças", descricao: "Recusado pelo professor", tipo: "urgente" },
  {
    id: "a2",
    titulo: "Dashboard financeiro",
    descricao: "Aguardando Staff há 3 dias",
    tipo: "atencao",
  },
];

const SALA = { sala: "Sala 204", data: "Sex 18/04", horario: "19:00" };

const RANKING: RankingV1Item[] = [
  { id: "r1", nome: "Liga Tech", score: 840, destaque: true },
  { id: "r2", nome: "Link Finance", score: 710 },
  { id: "r3", nome: "Marketing", score: 620 },
  { id: "r4", nome: "RH", score: 480 },
];

export function HomeDiretorViewV1() {
  const navigate = useNavigate();
  const [visao, setVisao] = useState<"minha" | "global">("minha");

  const metricas = visao === "minha" ? METRICAS_MINHA : METRICAS_GLOBAL;

  return (
    <div className="space-y-12">
      <section>
        <SectionHeader
          numero="01"
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

      {visao === "minha" && (
        <section>
          <SectionHeader
            numero="02"
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
          <AlertList items={ALERTAS} onClick={() => navigate("/projetos")} />
        </section>
      )}

      {visao === "minha" && (
        <section>
          <SectionHeader numero="03" eyebrow="Próxima reserva" titulo="Sala agendada" />
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-6">
            <div className="w-14 h-14 border border-navy flex items-center justify-center font-plex-sans font-bold text-[18px] text-navy">
              {SALA.sala.replace("Sala ", "")}
            </div>
            <div>
              <div className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/60">
                Localização
              </div>
              <div className="font-plex-sans font-semibold text-[15px] text-navy mt-1">
                {SALA.sala}
              </div>
            </div>
            <div className="text-right">
              <div className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/60">
                Quando
              </div>
              <div className="font-plex-sans font-semibold text-[15px] text-navy mt-1">
                {SALA.data} · {SALA.horario}
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionHeader
          numero={visao === "minha" ? "04" : "02"}
          eyebrow="Ranking geral"
          titulo="Pontuação das ligas"
        />
        <RankingList items={RANKING} />
      </section>
    </div>
  );
}
