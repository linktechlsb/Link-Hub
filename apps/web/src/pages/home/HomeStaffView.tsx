import { useNavigate } from "react-router-dom"
import {
  Users, UserCheck, FolderKanban, Activity,
  AlertTriangle, CalendarX, Clock,
  TrendingUp, CheckCircle2, Medal,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { KpiCard } from "./KpiCard"
import { cn } from "@/lib/utils"

// ─── mock data ────────────────────────────────────────────────────────────────

const METRICAS_STAFF = [
  { label: "Ligas ativas",      valor: "4",   Icon: Users,         trend: "↑ +1 este mês",  trendType: "up"      },
  { label: "Membros",           valor: "96",  Icon: UserCheck,     trend: "↑ +5 este mês",  trendType: "up"      },
  { label: "Projetos ativos",   valor: "8",   Icon: FolderKanban,  trend: "↔ estável",       trendType: "neutral" },
  { label: "Engajamento geral", valor: "78%", Icon: Activity,      trend: "↑ +3%",           trendType: "up"      },
] as const

const METRICAS_ENGAJAMENTO = [
  { label: "Média de presença", valor: "71%",       trendType: "neutral" as const },
  { label: "Reuniões no mês",   valor: "14",         trendType: "up"      as const },
  { label: "Eventos ativos",    valor: "3",          trendType: "up"      as const },
  { label: "Receita total",     valor: "R$ 8.700",   trendType: "up"      as const },
]

const ALERTAS_STAFF = [
  { id: "s1", titulo: "Liga RH",       descricao: "Engajamento em 32% — abaixo do mínimo",  rota: "/gerenciamento", Icon: Activity,  tipo: "urgente" },
  { id: "s3", titulo: "Liga Marketing", descricao: "Sem reunião registrada há 2 semanas",   rota: "/gerenciamento", Icon: CalendarX, tipo: "atencao" },
]

const RANKING_PRESENCA = [
  { id: "p1", nome: "Liga Tech",    presenca: 94 },
  { id: "p2", nome: "Link Finance", presenca: 87 },
  { id: "p3", nome: "Marketing",    presenca: 72 },
  { id: "p4", nome: "RH",           presenca: 32 },
]

const DESTAQUES_MOCK = [
  { id: "1", Icon: TrendingUp,   label: "SCORE",   titulo: "Liga de Marketing", sub: "+12pts essa semana" },
  { id: "2", Icon: CheckCircle2, label: "PROJETO", titulo: "Análise de Mercado", sub: "Concluído ontem" },
  { id: "3", Icon: Medal,        label: "RANKING", titulo: "#1 Liga de Finanças", sub: "Lidera a temporada" },
]

// ─── component ────────────────────────────────────────────────────────────────

interface HomeStaffViewProps {
  pendentes: {
    projetos: { id: string; titulo: string; liga?: { nome: string } }[]
    eventos:  { id: string; titulo: string; liga?: { nome: string } }[]
  }
}

export function HomeStaffView({ pendentes }: HomeStaffViewProps) {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Destaques da semana */}
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Destaques da Semana
        </p>
        <div className="grid grid-cols-3 gap-3">
          {DESTAQUES_MOCK.map((d) => (
            <Card key={d.id} className="shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <d.Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    {d.label}
                  </span>
                </div>
                <div className="font-bold text-navy text-sm">{d.titulo}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{d.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Métricas globais */}
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Métricas Globais
        </p>
        <div className="grid grid-cols-4 gap-3">
          {METRICAS_STAFF.map((m) => (
            <KpiCard
              key={m.label}
              label={m.label}
              value={m.valor}
              trend={m.trend}
              trendType={m.trendType}
              icon={<m.Icon className="h-4 w-4 text-muted-foreground" />}
            />
          ))}
        </div>
      </div>

      {/* Alertas de atenção */}
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
          {ALERTAS_STAFF.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate(a.rota)}
              className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 hover:bg-amber-100 transition-colors shadow-sm"
            >
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
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
                  {pendentes.projetos.length} projeto{pendentes.projetos.length > 1 ? "s" : ""} aguardando aprovação
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
              <CalendarX className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-navy">
                  {pendentes.eventos.length} evento{pendentes.eventos.length > 1 ? "s" : ""} aguardando aprovação
                </p>
                <p className="text-xs text-amber-700 mt-0.5">Clique para revisar e aprovar</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Ranking de presença */}
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
                  Presença
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold w-32">
                  Barra
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RANKING_PRESENCA.map((r, i) => {
                const baixa = r.presenca < 50
                const media = r.presenca < 70
                const barClass = baixa
                  ? "[&>div]:bg-red-500"
                  : media
                  ? "[&>div]:bg-amber-500"
                  : "[&>div]:bg-green-500"
                return (
                  <TableRow key={r.id} className={baixa ? "bg-red-50" : undefined}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-xs font-bold w-5 text-center",
                            baixa ? "text-red-500" : "text-muted-foreground"
                          )}
                        >
                          {i + 1}º
                        </span>
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            baixa ? "text-red-600" : "text-slate-700"
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
                          baixa ? "text-red-600" : media ? "text-amber-600" : "text-green-600"
                        )}
                      >
                        {r.presenca}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Progress value={r.presenca} className={cn("h-1.5 w-28", barClass)} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Engajamento global */}
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Engajamento Global
        </p>
        <div className="grid grid-cols-4 gap-3">
          {METRICAS_ENGAJAMENTO.map((m) => (
            <KpiCard
              key={m.label}
              label={m.label}
              value={m.valor}
              trendType={m.trendType}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
