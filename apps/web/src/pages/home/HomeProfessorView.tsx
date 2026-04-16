import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Clock, CalendarDays } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination"
import { KpiCard } from "./KpiCard"

// ─── mock data ────────────────────────────────────────────────────────────────

const METRICAS_PROFESSOR = [
  { label: "Score",           valor: "840 pts", trend: "↑ +12pts", trendType: "up"      as const },
  { label: "Projetos ativos", valor: "5",        trend: "↔ estável", trendType: "neutral" as const },
  { label: "Membros",         valor: "24",       trend: "↑ +2",      trendType: "up"      as const },
  { label: "Frequência",      valor: "87%",      trend: "↑ +3%",     trendType: "up"      as const },
]

const FILA_PROFESSOR = [
  { id: "f1", nome: "App de presenças",     diasAguardando: 9 },
  { id: "f2", nome: "API de integração",    diasAguardando: 2 },
  { id: "f3", nome: "Sistema de feedback",  diasAguardando: 1 },
]

const EVENTOS_PROFESSOR = [
  { id: "e1", nome: "Reunião semanal",      data: "Sex 18/04", hora: "19h" },
  { id: "e2", nome: "Workshop de produto",  data: "Ter 22/04", hora: "18h" },
]

const PER_PAGE = 5

// ─── component ────────────────────────────────────────────────────────────────

export function HomeProfessorView() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)

  const totalPages = Math.ceil(FILA_PROFESSOR.length / PER_PAGE)
  const filaPaginada = FILA_PROFESSOR.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Métricas da Liga
        </p>
        <div className="grid grid-cols-4 gap-3">
          {METRICAS_PROFESSOR.map((m) => (
            <KpiCard
              key={m.label}
              label={m.label}
              value={m.valor}
              trend={m.trend}
              trendType={m.trendType}
            />
          ))}
        </div>
      </div>

      {/* Fila de aprovação */}
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
                const urgente = p.diasAguardando > 7
                const medio   = p.diasAguardando >= 4
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
                          há {p.diasAguardando} dia{p.diasAguardando > 1 ? "s" : ""}
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
                )
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
                      className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
                      className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </Card>
      </div>

      {/* Próximos eventos */}
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Próximos Eventos da Liga
        </p>
        <Card className="shadow-sm overflow-hidden">
          {EVENTOS_PROFESSOR.map((e, i) => (
            <div
              key={e.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i < EVENTOS_PROFESSOR.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy">{e.nome}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {e.data} às {e.hora}
                </p>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
