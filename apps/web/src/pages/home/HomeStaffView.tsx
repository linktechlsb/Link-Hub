import { CalendarPlus, FileText, CheckSquare, FolderPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AtalhoCard } from "./AtalhoCard";
import { EventosFuturosCard } from "./EventosFuturosCard";
import { KpiCard } from "./KpiCard";
import { MembrosCard } from "./MembrosCard";
import { RankingLigasCard } from "./RankingLigasCard";
import { TimelineAtividade } from "./TimelineAtividade";

import type { Liga, RankingLiga } from "@link-leagues/types";

interface HomeStaffViewProps {
  ligas: Liga[];
  ranking: RankingLiga[];
}

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function HomeStaffView({ ligas, ranking }: HomeStaffViewProps) {
  const navigate = useNavigate();
  const [selectedLigaId, setSelectedLigaId] = useState<string | null>(ligas[0]?.id ?? null);

  const selectedLiga = ligas.find((l) => l.id === selectedLigaId) ?? null;
  const rankingMinha = ranking.find((r) => r.liga_id === selectedLigaId) ?? null;

  const totalMembros = selectedLiga?.total_membros ?? 0;

  const metricas = [
    {
      label: "Projetos ativos",
      value: String(rankingMinha?.projetos_em_andamento ?? selectedLiga?.projetos_ativos ?? 0),
    },
    {
      label: "Receita",
      value: formatarMoeda(rankingMinha?.receita_total ?? 0),
    },
    {
      label: "Membros",
      value: String(totalMembros),
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

      {/* Métricas da liga selecionada */}
      <div>
        <p className="text-xs font-bold text-link-blue dark:text-white uppercase tracking-wider mb-3">
          {selectedLiga ? `Métricas — ${selectedLiga.nome}` : "Métricas"}
        </p>
        <div className="grid grid-cols-4 gap-3">
          {metricas.map((m) => (
            <KpiCard key={m.label} label={m.label} value={m.value} trendType="neutral" />
          ))}
        </div>
      </div>

      {/* Timeline + Membros */}
      <div className="grid grid-cols-[1fr_280px] gap-4 items-stretch">
        <TimelineAtividade
          ligaId={selectedLigaId}
          isStaff
          ligas={ligas}
          ranking={ranking}
          onLigaChange={(id) => setSelectedLigaId(id)}
        />
        <MembrosCard ligaId={selectedLigaId} />
      </div>

      {/* Eventos futuros + Ranking */}
      <div className="grid grid-cols-[1fr_280px] gap-4 items-stretch">
        <EventosFuturosCard ligaId={selectedLigaId} isStaff />
        <RankingLigasCard ranking={ranking} minhaLigaId={selectedLigaId} />
      </div>
    </div>
  );
}
