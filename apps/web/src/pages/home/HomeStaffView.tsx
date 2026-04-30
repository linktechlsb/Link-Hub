import {
  Users,
  UserCheck,
  FolderKanban,
  Activity,
  AlertTriangle,
  CalendarX,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { cn } from "@/lib/utils";

import { KpiCard } from "./KpiCard";

import type { Evento, Liga, RankingLiga } from "@link-leagues/types";

interface HomeStaffViewProps {
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

export function HomeStaffView({ pendentes, ligas, ranking }: HomeStaffViewProps) {
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

  const metricasGlobais = [
    { label: "Ligas ativas", valor: String(ligas.length), Icon: Users },
    { label: "Membros", valor: String(totalMembros), Icon: UserCheck },
    { label: "Projetos ativos", valor: String(totalProjetos), Icon: FolderKanban },
    { label: "Presenças totais", valor: String(totalPresencas), Icon: Activity },
  ];

  const metricasEngajamento = [
    { label: "Reuniões no mês", valor: String(eventosMes.length) },
    { label: "Eventos ativos", valor: String(eventosFuturos.length) },
    { label: "Receita total", valor: formatarMoeda(totalReceita) },
    { label: "Presenças totais", valor: String(totalPresencas) },
  ];

  // Alertas: ligas sem evento futuro programado
  const ligasComEvento = new Set(eventosFuturos.map((e) => e.liga_id));
  const alertasLigas = ligas
    .filter((l) => !ligasComEvento.has(l.id))
    .slice(0, 3)
    .map((l) => ({
      id: `sem-evento-${l.id}`,
      titulo: l.nome,
      descricao: "Sem eventos futuros programados",
    }));

  const rankingPresenca = [...ranking]
    .sort((a, b) => (b.presencas ?? 0) - (a.presencas ?? 0))
    .slice(0, 5);
  const maxPresencas = Math.max(...rankingPresenca.map((r) => r.presencas ?? 0), 1);

  const temAlertas =
    alertasLigas.length > 0 || pendentes.projetos.length > 0 || pendentes.eventos.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Métricas Globais
        </p>
        <div className="grid grid-cols-4 gap-3">
          {metricasGlobais.map((m) => (
            <KpiCard
              key={m.label}
              label={m.label}
              value={m.valor}
              trendType="neutral"
              icon={<m.Icon className="h-4 w-4 text-muted-foreground" />}
            />
          ))}
        </div>
      </div>

      {temAlertas && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
              Alertas de Atenção
            </p>
            <button
              onClick={() => navigate("/super-admin")}
              className="text-xs text-link-blue font-semibold hover:underline"
            >
              Ver todos
            </button>
          </div>
          <div className="space-y-2">
            {alertasLigas.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate("/gerenciamento")}
                className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 hover:bg-amber-100 transition-colors shadow-sm"
              >
                <CalendarX className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-navy">{a.titulo}</p>
                  <p className="text-xs text-amber-700 mt-0.5">{a.descricao}</p>
                </div>
              </button>
            ))}
            {pendentes.projetos.length > 0 && (
              <button
                onClick={() => navigate("/super-admin")}
                className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 hover:bg-amber-100 transition-colors shadow-sm"
              >
                <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-navy">
                    {pendentes.projetos.length} projeto{pendentes.projetos.length > 1 ? "s" : ""}{" "}
                    aguardando aprovação
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">Clique para revisar e aprovar</p>
                </div>
              </button>
            )}
            {pendentes.eventos.length > 0 && (
              <button
                onClick={() => navigate("/super-admin")}
                className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 hover:bg-amber-100 transition-colors shadow-sm"
              >
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-navy">
                    {pendentes.eventos.length} evento{pendentes.eventos.length > 1 ? "s" : ""}{" "}
                    aguardando aprovação
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">Clique para revisar e aprovar</p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {rankingPresenca.length > 0 && (
        <div>
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
            Ranking de Presença
          </p>
          <Card className="shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                    Liga
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold w-24">
                    Presenças
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold w-32">
                    Barra
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingPresenca.map((r, i) => {
                  const percent = Math.round(((r.presencas ?? 0) / maxPresencas) * 100);
                  const baixa = percent < 33;
                  const media = percent < 66;
                  const barClass = baixa
                    ? "[&>div]:bg-red-500"
                    : media
                      ? "[&>div]:bg-amber-500"
                      : "[&>div]:bg-green-500";
                  return (
                    <TableRow key={r.liga_id} className={baixa ? "bg-red-50" : undefined}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-xs font-bold w-5 text-center",
                              baixa ? "text-red-500" : "text-muted-foreground",
                            )}
                          >
                            {i + 1}º
                          </span>
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              baixa ? "text-red-600" : "text-slate-700",
                            )}
                          >
                            {r.nome}
                          </span>
                          {baixa && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-red-300 text-red-600 bg-red-50"
                            >
                              baixa
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-sm font-bold",
                            baixa ? "text-red-600" : media ? "text-amber-600" : "text-green-600",
                          )}
                        >
                          {r.presencas ?? 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Progress value={percent} className={cn("h-1.5 w-28", barClass)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Engajamento Global
        </p>
        <div className="grid grid-cols-4 gap-3">
          {metricasEngajamento.map((m) => (
            <KpiCard key={m.label} label={m.label} value={m.valor} trendType="neutral" />
          ))}
        </div>
      </div>
    </div>
  );
}
