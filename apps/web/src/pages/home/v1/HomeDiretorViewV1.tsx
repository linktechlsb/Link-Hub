import { MapPin } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { cn } from "@/lib/utils";

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
      tipo: p.status === "rejeitado" ? "urgente" : ("atencao" as const),
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

  return (
    <div className="space-y-6">
      <section>
        <SectionHeader
          titulo={`Métricas · ${visao === "minha" ? "Minha Liga" : "Global"}`}
          acao={
            <div className="flex">
              <button
                onClick={() => setVisao("minha")}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold border border-[#191919] transition-colors rounded-l-md",
                  visao === "minha"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Minha
              </button>
              <button
                onClick={() => setVisao("global")}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold border border-[#191919] border-l-0 transition-colors rounded-r-md",
                  visao === "global"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
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
            titulo="Projetos com Pendência"
            acao={
              <button
                onClick={() => navigate("/projetos")}
                className="text-xs font-semibold text-link-blue hover:underline"
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
          <SectionHeader titulo="Próxima Reserva" />
          <Card className="shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg border border-[#191919] flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Localização
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{sala.nome}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Quando</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {dataFmt} · {proximoEvento.hora_inicio?.slice(0, 5)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {rankingItems.length > 0 && (
        <section>
          <SectionHeader titulo="Ranking das Ligas" />
          <RankingList items={rankingItems} />
        </section>
      )}
    </div>
  );
}
