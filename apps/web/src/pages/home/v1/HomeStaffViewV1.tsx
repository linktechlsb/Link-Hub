import { Activity, FolderKanban, UserCheck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Progress } from "@/components/ui/progress";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { cn } from "@/lib/utils";

import { AlertList, EditorialTable, KpiRow, SectionHeader, type AlertV1Item } from "./primitives";

import type { Evento, Liga, RankingLiga } from "@link-leagues/types";

interface HomeStaffViewV1Props {
  pendentes: {
    projetos: { id: string; titulo: string; liga?: { nome: string } }[];
    eventos: { id: string; titulo: string; liga?: { nome: string } }[];
  };
  ligas: Liga[];
  ranking: RankingLiga[];
}

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function inicioMesIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function fimMesIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function HomeStaffViewV1({ pendentes, ligas, ranking }: HomeStaffViewV1Props) {
  const navigate = useNavigate();

  const { data: eventosMesData } = useCachedFetch<Evento[]>(
    `/api/eventos?inicio=${inicioMesIso()}&fim=${fimMesIso()}`,
  );
  const { data: eventosFuturosData } = useCachedFetch<Evento[]>(
    `/api/eventos?inicio=${new Date().toISOString().slice(0, 10)}`,
  );

  const eventosMes = eventosMesData ?? [];
  const eventosFuturos = eventosFuturosData ?? [];

  const totalMembros = ligas.reduce((acc, l) => acc + (l.total_membros ?? 0), 0);
  const totalProjetos = ranking.reduce((acc, r) => acc + (r.projetos_em_andamento ?? 0), 0);
  const totalReceita = ranking.reduce((acc, r) => acc + Number(r.receita_total ?? 0), 0);
  const totalPresencas = ranking.reduce((acc, r) => acc + (r.presencas ?? 0), 0);

  const metricas = [
    {
      label: "Ligas ativas",
      valor: String(ligas.length),
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Membros",
      valor: String(totalMembros),
      icon: <UserCheck className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Projetos ativos",
      valor: String(totalProjetos),
      icon: <FolderKanban className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Presenças",
      valor: String(totalPresencas),
      icon: <Activity className="h-4 w-4 text-muted-foreground" />,
    },
  ];

  const engajamento = [
    { label: "Reuniões no mês", valor: String(eventosMes.length) },
    { label: "Eventos ativos", valor: String(eventosFuturos.length) },
    { label: "Receita total", valor: formatarMoeda(totalReceita) },
    { label: "Presenças", valor: String(totalPresencas) },
  ];

  const ligasComEvento = new Set(eventosFuturos.map((e) => e.liga_id));
  const alertasLigas: AlertV1Item[] = ligas
    .filter((l) => !ligasComEvento.has(l.id))
    .slice(0, 3)
    .map((l) => ({
      id: `sem-evento-${l.id}`,
      titulo: l.nome,
      descricao: "Sem eventos futuros programados",
      tipo: "atencao",
    }));

  const alertasCompletos: AlertV1Item[] = [
    ...alertasLigas,
    ...(pendentes.projetos.length > 0
      ? [
          {
            id: "pend-proj",
            titulo: `${pendentes.projetos.length} projeto${pendentes.projetos.length > 1 ? "s" : ""} aguardando aprovação`,
            descricao: "Clique para revisar e aprovar",
            tipo: "atencao" as const,
          },
        ]
      : []),
    ...(pendentes.eventos.length > 0
      ? [
          {
            id: "pend-ev",
            titulo: `${pendentes.eventos.length} evento${pendentes.eventos.length > 1 ? "s" : ""} aguardando aprovação`,
            descricao: "Clique para revisar e aprovar",
            tipo: "atencao" as const,
          },
        ]
      : []),
  ];

  const presencaOrdenada = [...ranking]
    .sort((a, b) => (b.presencas ?? 0) - (a.presencas ?? 0))
    .slice(0, 5);
  const maxPresencas = Math.max(...presencaOrdenada.map((r) => r.presencas ?? 0), 1);

  return (
    <div className="space-y-6">
      <section>
        <SectionHeader titulo="Estado das Ligas" />
        <KpiRow items={metricas} />
      </section>

      {alertasCompletos.length > 0 && (
        <section>
          <SectionHeader
            titulo="Alertas de Atenção"
            acao={
              <button
                onClick={() => navigate("/super-admin")}
                className="text-xs font-semibold text-link-blue hover:underline"
              >
                Ver todos →
              </button>
            }
          />
          <AlertList items={alertasCompletos} onClick={() => navigate("/super-admin")} />
        </section>
      )}

      {presencaOrdenada.length > 0 && (
        <section>
          <SectionHeader titulo="Ranking de Presença" />
          <EditorialTable
            columns={["#", "Liga", "Presenças", "Barra"]}
            rows={presencaOrdenada.map((r, i) => {
              const percent = Math.round(((r.presencas ?? 0) / maxPresencas) * 100);
              const baixa = percent < 33;
              const media = percent < 66;
              const barClass = baixa
                ? "[&>div]:bg-red-500"
                : media
                  ? "[&>div]:bg-amber-500"
                  : "[&>div]:bg-green-500";
              return [
                <span
                  key="i"
                  className={cn(
                    "text-xs font-bold text-center",
                    baixa ? "text-red-400" : "text-muted-foreground",
                  )}
                >
                  {i + 1}º
                </span>,
                <span
                  key="n"
                  className={cn(
                    "text-sm",
                    baixa ? "font-bold text-foreground" : "font-medium text-foreground/70",
                  )}
                >
                  {r.nome}
                </span>,
                <span
                  key="p"
                  className={cn(
                    "text-sm font-bold",
                    baixa ? "text-red-400" : media ? "text-amber-400" : "text-green-500",
                  )}
                >
                  {r.presencas ?? 0}
                </span>,
                <Progress key="bar" value={percent} className={cn("h-1.5 w-28", barClass)} />,
              ];
            })}
          />
        </section>
      )}

      <section>
        <SectionHeader titulo="Engajamento Global" />
        <KpiRow items={engajamento} />
      </section>
    </div>
  );
}
