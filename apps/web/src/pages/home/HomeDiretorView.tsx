import { CalendarPlus, FileText, CheckSquare, FolderPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AtalhoCard } from "./AtalhoCard";
import { EventosFuturosCard } from "./EventosFuturosCard";
import { KpiCard } from "./KpiCard";
import { MembrosCard } from "./MembrosCard";
import { RankingLigasCard } from "./RankingLigasCard";
import { TimelineAtividade } from "./TimelineAtividade";

import type { Liga, RankingLiga } from "@link-leagues/types";

interface HomeDiretorViewProps {
  minhaLiga: Liga;
  ligas: Liga[];
  ranking: RankingLiga[];
}

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function HomeDiretorView({ minhaLiga, ligas, ranking }: HomeDiretorViewProps) {
  const navigate = useNavigate();

  const rankingMinha = ranking.find((r) => r.liga_id === minhaLiga.id) ?? null;
  const ligaInfo = ligas.find((l) => l.id === minhaLiga.id) ?? minhaLiga;

  const metricas = [
    {
      label: "Projetos ativos",
      value: String(rankingMinha?.projetos_em_andamento ?? ligaInfo?.projetos_ativos ?? 0),
    },
    {
      label: "Receita",
      value: formatarMoeda(rankingMinha?.receita_total ?? 0),
    },
    {
      label: "Membros",
      value: String(ligaInfo?.total_membros ?? 0),
    },
    {
      label: "Score",
      value: `${rankingMinha?.pontuacao ?? 0} pts`,
    },
  ];

  const atalhos = [
    { label: "Criar evento", Icon: CalendarPlus, onClick: () => navigate("/eventos/novo") },
    { label: "Criar postagem", Icon: FileText, onClick: () => navigate("/mural") },
    { label: "Marcar presença", Icon: CheckSquare, onClick: () => navigate("/presenca") },
    { label: "Criar projeto", Icon: FolderPlus, onClick: () => navigate("/projetos") },
  ];

  return (
    <div className="space-y-6">
      {/* Atalhos rápidos */}
      <div>
        <p className="text-xs font-bold text-link-blue dark:text-white uppercase tracking-wider mb-3">
          Atalhos
        </p>
        <div className="grid grid-cols-4 gap-3">
          {atalhos.map((a) => (
            <AtalhoCard key={a.label} label={a.label} Icon={a.Icon} onClick={a.onClick} />
          ))}
        </div>
      </div>

      {/* Métricas da liga */}
      <div>
        <p className="text-xs font-bold text-link-blue dark:text-white uppercase tracking-wider mb-3">
          Métricas — {minhaLiga.nome}
        </p>
        <div className="grid grid-cols-4 gap-3">
          {metricas.map((m) => (
            <KpiCard key={m.label} label={m.label} value={m.value} trendType="neutral" />
          ))}
        </div>
      </div>

      {/* Timeline + Membros */}
      <div className="grid grid-cols-[1fr_280px] gap-4 h-[340px]">
        <TimelineAtividade ligaId={minhaLiga.id} ranking={ranking} />
        <MembrosCard ligaId={minhaLiga.id} />
      </div>

      {/* Ranking + Eventos futuros */}
      <div className="grid grid-cols-[1fr_280px] gap-4 items-start">
        <RankingLigasCard ranking={ranking} minhaLigaId={minhaLiga.id} />
        <EventosFuturosCard ligaId={minhaLiga.id} />
      </div>
    </div>
  );
}
