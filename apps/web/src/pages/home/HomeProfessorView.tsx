import { Clock, CalendarDays } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCachedFetch } from "@/hooks/use-cached-fetch";

import { KpiCard } from "./KpiCard";

import type { Evento, Liga, Projeto, RankingLiga } from "@link-leagues/types";

interface HomeProfessorViewProps {
  minhaLiga: Liga;
  ranking: RankingLiga[];
}

const PER_PAGE = 5;

const diasDesde = (iso: string): number => {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

export function HomeProfessorView({ minhaLiga, ranking }: HomeProfessorViewProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const hojeIso = new Date().toISOString().slice(0, 10);
  const { data: projetosData } = useCachedFetch<Projeto[]>(`/api/projetos?liga_id=${minhaLiga.id}`);
  const { data: eventosData } = useCachedFetch<Evento[]>(
    `/api/eventos?liga_id=${minhaLiga.id}&inicio=${hojeIso}`,
  );

  const projetos = projetosData ?? [];
  const eventos = (eventosData ?? []).slice(0, 3);

  const rankingMinha = ranking.find((r) => r.liga_id === minhaLiga.id) ?? null;

  const metricas = [
    { label: "Score", valor: `${rankingMinha?.pontuacao ?? 0} pts` },
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

  const totalPages = Math.max(1, Math.ceil(fila.length / PER_PAGE));
  const filaPaginada = fila.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Métricas da Liga
        </p>
        <div className="grid grid-cols-4 gap-3">
          {metricas.map((m) => (
            <KpiCard key={m.label} label={m.label} value={m.valor} trendType="neutral" />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
            Fila de Aprovação
          </p>
          <button
            onClick={() => navigate("/projetos")}
            className="text-xs text-link-blue font-semibold hover:underline"
          >
            Ver todos
          </button>
        </div>
        <Card className="shadow-sm overflow-hidden">
          {fila.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              Nenhum projeto aguardando sua aprovação.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
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
                            <span className="text-sm font-semibold text-navy">{p.nome}</span>
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
                                  ? "border-red-300 text-red-600 bg-red-50 text-[10px]"
                                  : medio
                                    ? "border-amber-300 text-amber-700 bg-amber-50 text-[10px]"
                                    : "border-slate-300 text-slate-500 bg-slate-50 text-[10px]"
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
                <div className="border-t border-border px-4 py-2 bg-slate-50">
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

      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Próximos Eventos da Liga
        </p>
        <Card className="shadow-sm overflow-hidden">
          {eventos.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              Sem eventos programados.
            </div>
          ) : (
            eventos.map((e, i) => {
              const data = new Date(e.data);
              const dataFmt = data.toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
              });
              return (
                <div
                  key={e.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < eventos.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy">{e.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dataFmt}
                      {e.hora_inicio ? ` às ${e.hora_inicio.slice(0, 5)}` : ""}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}
