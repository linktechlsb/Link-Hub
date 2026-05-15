import { CalendarPlus, CheckSquare, Clock, FileText, FolderPlus, UserPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCachedFetch } from "@/hooks/use-cached-fetch";

import { AtalhoCard } from "./AtalhoCard";
import { EventosFuturosCard } from "./EventosFuturosCard";
import { KpiCard } from "./KpiCard";
import { LigasCarousel } from "./LigasCarousel";
import { MembrosCard } from "./MembrosCard";
import { RankingLigasCard } from "./RankingLigasCard";
import { SectionLabel } from "./SectionLabel";

import type { Evento, Liga, Projeto, RankingLiga } from "@link-leagues/types";

interface HomeViewProps {
  role: string | null;
  ligas: Liga[];
  ranking: RankingLiga[];
  minhaLiga: Liga | null;
  usuarioId: string | null;
  loading?: boolean;
}

const PER_PAGE = 5;

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const diasDesde = (iso: string): number => {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

function formatarProximoEvento(evento: Evento | null): string {
  if (!evento) return "—";
  const data = new Date(evento.data);
  const dataStr = data.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  return evento.hora_inicio ? `${dataStr} às ${evento.hora_inicio.slice(0, 5)}` : dataStr;
}

export function HomeView({
  role,
  ligas,
  ranking,
  minhaLiga,
  usuarioId,
  loading = false,
}: HomeViewProps) {
  const navigate = useNavigate();
  const [selectedLigaId, setSelectedLigaId] = useState<string | null>(ligas[0]?.id ?? null);
  const [page, setPage] = useState(1);

  const canManage = role === "staff" || role === "diretor";
  const ligaId = role === "staff" ? selectedLigaId : (minhaLiga?.id ?? null);
  const ligaAtual = ligas.find((l) => l.id === ligaId) ?? minhaLiga ?? null;
  const rankingLiga = ranking.find((r) => r.liga_id === ligaId) ?? null;

  const { data: projetosData, carregando: projetosLoading } = useCachedFetch<Projeto[]>(
    (role === "membro" || role === "professor") && ligaId
      ? `/api/projetos?liga_id=${ligaId}`
      : null,
  );
  const { data: todosProjetos } = useCachedFetch<Projeto[]>(
    role === "staff" ? "/api/projetos" : null,
  );
  const { data: proximoEvento } = useCachedFetch<Evento>(
    role === "membro" && ligaId ? `/api/ligas/${ligaId}/eventos/proximo` : null,
  );

  const projetos = projetosData ?? [];

  // Métricas por role
  let metricas: { label: string; value: string }[] = [];

  if (role === "staff") {
    const totalMembros = ligas.reduce((s, l) => s + (l.total_membros ?? 0), 0);
    const totalAtivos = (todosProjetos ?? []).filter((p) => p.status === "aprovado").length;
    const totalConcluidos = ranking.reduce((s, r) => s + (r.projetos_concluidos ?? 0), 0);
    const receitaTotal = ranking.reduce((s, r) => s + Number(r.receita_total ?? 0), 0);
    metricas = [
      { label: "Projetos ativos", value: String(totalAtivos) },
      { label: "Total de membros", value: String(totalMembros) },
      { label: "Receita total", value: formatarMoeda(receitaTotal) },
      { label: "Projetos concluídos", value: String(totalConcluidos) },
    ];
  } else if (role === "diretor") {
    metricas = [
      {
        label: "Projetos ativos",
        value: String(rankingLiga?.projetos_em_andamento ?? ligaAtual?.projetos_ativos ?? 0),
      },
      { label: "Receita", value: formatarMoeda(Number(rankingLiga?.receita_total ?? 0)) },
      { label: "Membros", value: String(ligaAtual?.total_membros ?? 0) },
      { label: "Score", value: `${rankingLiga?.pontuacao ?? 0} pts` },
    ];
  } else if (role === "professor") {
    metricas = [
      { label: "Score", value: `${rankingLiga?.pontuacao ?? 0} pts` },
      { label: "Projetos ativos", value: String(rankingLiga?.projetos_em_andamento ?? 0) },
      { label: "Membros", value: String(minhaLiga?.total_membros ?? 0) },
      { label: "Presenças", value: String(rankingLiga?.presencas ?? 0) },
    ];
  } else if (role === "membro") {
    const meusProjetos = usuarioId
      ? projetos.filter(
          (p) =>
            p.responsavel_id === usuarioId &&
            p.status !== "rascunho" &&
            p.status !== "rejeitado" &&
            p.status !== "cancelado",
        )
      : [];
    metricas = [
      { label: "Score da liga", value: `${rankingLiga?.pontuacao ?? 0} pts` },
      { label: "Membros", value: String(ligaAtual?.total_membros ?? 0) },
      { label: "Projetos que participo", value: String(meusProjetos.length) },
      { label: "Próxima reunião", value: formatarProximoEvento(proximoEvento ?? null) },
    ];
  }

  // Fila de aprovação (professor)
  const filaAprovacao = projetos
    .filter((p) => p.aprovacao_professor === "pendente" && p.status === "em_aprovacao")
    .map((p) => ({ id: p.id, nome: p.titulo, diasAguardando: diasDesde(p.criado_em) }));
  const totalPages = Math.max(1, Math.ceil(filaAprovacao.length / PER_PAGE));
  const filaPaginada = filaAprovacao.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const atalhos = [
    { label: "Criar evento", Icon: CalendarPlus, onClick: () => navigate("/agenda?criar=true") },
    {
      label: "Criar postagem",
      Icon: FileText,
      onClick: () => navigate("/mural", { state: { abrirModal: true } }),
    },
    role === "staff"
      ? {
          label: "Adicionar usuário",
          Icon: UserPlus,
          onClick: () => navigate("/super-admin", { state: { aba: "usuarios", abrirCriar: true } }),
        }
      : {
          label: "Marcar presença",
          Icon: CheckSquare,
          onClick: () => navigate("/gerenciamento", { state: { aba: "Presença" } }),
        },
    {
      label: "Criar projeto",
      Icon: FolderPlus,
      onClick: () => navigate("/projetos", { state: { abrirCriar: true } }),
    },
  ];

  const metricasLabel =
    role === "staff"
      ? "Métricas da Plataforma"
      : canManage || role === "membro"
        ? `Métricas${ligaAtual ? ` — ${ligaAtual.nome}` : ""}`
        : "Métricas da Liga";

  return (
    <div className="space-y-6">
      {/* Carrossel + Membros — diretor e membro */}
      {(canManage || role === "membro") && (
        <div
          className={`grid gap-4 items-stretch ${role !== "staff" ? "grid-cols-[1fr_280px]" : "grid-cols-1"}`}
        >
          <LigasCarousel ligas={ligas} ranking={ranking} loading={loading} />
          {role !== "staff" && (
            <div className="relative">
              <div className="absolute inset-0">
                <MembrosCard ligaId={ligaId} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Métricas — todos */}
      {(loading || metricas.length > 0) && role !== null && (
        <div>
          <SectionLabel>{metricasLabel}</SectionLabel>
          <div className="grid grid-cols-4 gap-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <KpiCard key={i} label="" value="" loading />
                ))
              : metricas.map((m) => (
                  <KpiCard key={m.label} label={m.label} value={m.value} trendType="neutral" />
                ))}
          </div>
        </div>
      )}

      {/* Atalhos — staff + diretor */}
      {canManage && (
        <div>
          <SectionLabel>Atalhos</SectionLabel>
          <div className="grid grid-cols-4 gap-3">
            {atalhos.map((a) => (
              <AtalhoCard key={a.label} label={a.label} Icon={a.Icon} onClick={a.onClick} />
            ))}
          </div>
        </div>
      )}

      {/* Fila de aprovação — professor */}
      {role === "professor" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Fila de Aprovação</SectionLabel>
            <button
              onClick={() => navigate("/projetos")}
              className="text-xs text-link-blue font-semibold hover:underline -mt-3"
            >
              Ver todos
            </button>
          </div>
          <Card className="shadow-sm overflow-hidden">
            {projetosLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Projeto
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold w-36">
                      Aguardando
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold w-28">
                      Ação
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4 shrink-0 rounded" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-5 w-16 rounded-md" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-7 w-16 rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : filaAprovacao.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                Nenhum projeto aguardando sua aprovação.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                        Projeto
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold w-36">
                        Aguardando
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold w-28">
                        Ação
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filaPaginada.map((p) => {
                      const urgente = p.diasAguardando > 7;
                      const medio = p.diasAguardando >= 4;
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm font-semibold text-foreground">
                                {p.nome}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                há {p.diasAguardando} dia{p.diasAguardando !== 1 ? "s" : ""}
                              </span>
                              <Badge
                                variant="outline"
                                className={
                                  urgente
                                    ? "border-red-800/40 text-red-400 bg-transparent text-[10px]"
                                    : medio
                                      ? "border-amber-700/40 text-amber-400 bg-transparent text-[10px]"
                                      : "border-foreground/20 text-foreground/50 bg-transparent text-[10px]"
                                }
                              >
                                {urgente ? "Urgente" : medio ? "Atenção" : "Aguardando"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => navigate("/projetos")}
                            >
                              Revisar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
                  <div className="border-t border-border px-4 py-2 bg-background">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className={
                              page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <PaginationItem key={p}>
                            <PaginationLink
                              isActive={p === page}
                              onClick={() => setPage(p)}
                              className="cursor-pointer"
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            className={
                              page === totalPages
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {/* Ranking + Eventos futuros — todos */}
      <div className="grid grid-cols-[1fr_280px] gap-4 items-start">
        <RankingLigasCard ranking={ranking} minhaLigaId={ligaId} loading={loading} />
        <EventosFuturosCard ligaId={ligaId} isStaff={role === "staff"} />
      </div>
    </div>
  );
}
