import { AlertTriangle, MapPin } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCachedFetch } from "@/hooks/use-cached-fetch";

import { KpiCard } from "./KpiCard";
import { RankingLigas, type RankingItem } from "./RankingLigas";

import type { Evento, Liga, Projeto, RankingLiga, Sala } from "@link-leagues/types";

interface HomeDiretorViewProps {
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

export function HomeDiretorView({ minhaLiga, ligas, ranking }: HomeDiretorViewProps) {
  const navigate = useNavigate();
  const [visao, setVisao] = useState<"minha" | "global">("minha");

  const { data: projetosData } = useCachedFetch<Projeto[]>(`/api/projetos?liga_id=${minhaLiga.id}`);
  const { data: proximoEvento } = useCachedFetch<Evento>(
    `/api/ligas/${minhaLiga.id}/eventos/proximo`,
  );
  const { data: salasData } = useCachedFetch<Sala[]>(proximoEvento?.sala_id ? `/api/salas` : null);
  const salaData = salasData?.find((s) => s.id === proximoEvento?.sala_id) ?? null;

  const projetos = projetosData ?? [];

  const rankingMinha = ranking.find((r) => r.liga_id === minhaLiga.id) ?? null;
  const ligaInfo = ligas.find((l) => l.id === minhaLiga.id) ?? null;

  const metricasMinha = [
    {
      label: "Projetos ativos",
      valor: String(rankingMinha?.projetos_em_andamento ?? ligaInfo?.projetos_ativos ?? 0),
    },
    { label: "Receita", valor: formatarMoeda(rankingMinha?.receita_total ?? 0) },
    { label: "Membros", valor: String(ligaInfo?.total_membros ?? 0) },
    { label: "Score", valor: `${rankingMinha?.pontuacao ?? 0} pts` },
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
    { label: "Score médio", valor: `${scoreMedio} pts` },
  ];

  const metricas = visao === "minha" ? metricasMinha : metricasGlobal;

  // Alertas: rejeitados ou em aprovação há mais de 3 dias
  const alertas = projetos
    .filter((p) => {
      if (p.status === "rejeitado") return true;
      if (p.status === "em_aprovacao" && diasDesde(p.criado_em) > 3) return true;
      return false;
    })
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      projeto: p.titulo,
      motivo:
        p.status === "rejeitado"
          ? "projeto rejeitado"
          : `aguardando aprovação há ${diasDesde(p.criado_em)} dias`,
    }));

  const rankingItems: RankingItem[] = ranking.map((r) => ({
    id: r.liga_id,
    nome: r.nome,
    score: r.pontuacao,
    minhaLiga: r.liga_id === minhaLiga.id,
  }));

  const mostrarSala = visao === "minha" && proximoEvento && salaData && proximoEvento.hora_inicio;
  const dataEvento = proximoEvento ? new Date(proximoEvento.data) : null;
  const dataFormatada = dataEvento
    ? dataEvento.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
    : "";

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-4 gap-3">
        {metricas.map((m) => (
          <KpiCard key={m.label} label={m.label} value={m.valor} trendType="neutral" />
        ))}
      </div>

      {visao === "minha" && alertas.length > 0 && (
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
            {alertas.map((a) => (
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

      {mostrarSala && (
        <div>
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
            Próxima Sala Reservada
          </p>
          <Card className="shadow-sm">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg border border-border flex items-center justify-center font-bold text-sm text-navy bg-slate-50 shrink-0">
                {salaData.nome.replace(/[^0-9]/g, "") || salaData.nome.slice(0, 3)}
              </div>
              <div>
                <p className="text-sm font-semibold text-navy flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {salaData.nome}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dataFormatada} às {proximoEvento.hora_inicio?.slice(0, 5)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
