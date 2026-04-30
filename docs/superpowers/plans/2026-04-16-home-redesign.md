# Home Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `HomePage.tsx` into a polished "Corporativo Premium" visual style — same functionality, all sections kept, upgraded components (Card, Table, Pagination, Progress, Badge, Skeleton, Tabs, DropdownMenu).

**Architecture:** Split the monolithic 809-line file into shared sub-components + one view file per role, following the pattern established in `apps/web/src/pages/projetos/`. `HomePage.tsx` becomes a thin router that fetches data and delegates to the appropriate view.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, shadcn/ui (Table, Pagination, Progress, Badge to install; Card, Skeleton, Tabs, DropdownMenu already installed), Lucide React.

---

## File Map

| Action  | File                                            | Responsibility                           |
| ------- | ----------------------------------------------- | ---------------------------------------- |
| Install | `apps/web/src/components/ui/table.tsx`          | shadcn Table                             |
| Install | `apps/web/src/components/ui/pagination.tsx`     | shadcn Pagination                        |
| Install | `apps/web/src/components/ui/progress.tsx`       | shadcn Progress                          |
| Install | `apps/web/src/components/ui/badge.tsx`          | shadcn Badge                             |
| Create  | `apps/web/src/pages/home/KpiCard.tsx`           | Reusable KPI metric card with skeleton   |
| Create  | `apps/web/src/pages/home/LigasCarousel.tsx`     | Ligas carousel (extracted + redesigned)  |
| Create  | `apps/web/src/pages/home/MinhaLigaCard.tsx`     | "Minha Liga" status card (redesigned)    |
| Create  | `apps/web/src/pages/home/RankingLigas.tsx`      | Shared ranking widget (Diretor + Membro) |
| Create  | `apps/web/src/pages/home/HomeStaffView.tsx`     | Full Staff view                          |
| Create  | `apps/web/src/pages/home/HomeDiretorView.tsx`   | Full Diretor view                        |
| Create  | `apps/web/src/pages/home/HomeProfessorView.tsx` | Full Professor view                      |
| Create  | `apps/web/src/pages/home/HomeMembroView.tsx`    | Full Membro view                         |
| Rewrite | `apps/web/src/pages/home/HomePage.tsx`          | Data fetching + role router              |

---

## Task 1: Install shadcn components

**Files:**

- Create: `apps/web/src/components/ui/table.tsx`
- Create: `apps/web/src/components/ui/pagination.tsx`
- Create: `apps/web/src/components/ui/progress.tsx`
- Create: `apps/web/src/components/ui/badge.tsx`

- [ ] **Step 1: Install table, pagination, progress, and badge**

```bash
cd apps/web
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add pagination
pnpm dlx shadcn@latest add progress
pnpm dlx shadcn@latest add badge
```

Expected: 4 new files in `apps/web/src/components/ui/`.

- [ ] **Step 2: Verify files exist**

```bash
ls apps/web/src/components/ui/ | grep -E "table|pagination|progress|badge"
```

Expected output:

```
badge.tsx
pagination.tsx
progress.tsx
table.tsx
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/table.tsx apps/web/src/components/ui/pagination.tsx apps/web/src/components/ui/progress.tsx apps/web/src/components/ui/badge.tsx
git commit -m "feat: install shadcn table, pagination, progress, badge for home redesign"
```

---

## Task 2: KpiCard component

**Files:**

- Create: `apps/web/src/pages/home/KpiCard.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/pages/home/KpiCard.tsx` with this exact content:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  trend?: string;
  trendType?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  loading?: boolean;
}

export function KpiCard({
  label,
  value,
  trend,
  trendType = "up",
  icon,
  loading = false,
}: KpiCardProps) {
  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-5 pb-4">
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-28 mt-2" />
        </CardContent>
      </Card>
    );
  }

  const trendClass =
    trendType === "up"
      ? "text-green-600"
      : trendType === "down"
        ? "text-red-500"
        : "text-amber-500";

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5 pb-4">
        {icon && (
          <div className="h-8 w-8 rounded-lg bg-slate-50 border border-border flex items-center justify-center mb-3">
            {icon}
          </div>
        )}
        <div className="text-3xl font-bold text-navy leading-none">{value}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide mt-2">{label}</div>
        {trend && <div className={cn("text-xs mt-1.5 font-medium", trendClass)}>{trend}</div>}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /path/to/repo && pnpm typecheck 2>&1 | head -20
```

Expected: no errors related to `KpiCard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/home/KpiCard.tsx
git commit -m "feat: add KpiCard component with skeleton loading state"
```

---

## Task 3: LigasCarousel component

**Files:**

- Create: `apps/web/src/pages/home/LigasCarousel.tsx`

Extracted from `HomePage.tsx` + redesigned: `backdrop-blur-sm` on controls, `border border-border` on carousel container, cleaner dot indicators, 4s auto-rotation.

- [ ] **Step 1: Create the component**

Create `apps/web/src/pages/home/LigasCarousel.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Liga } from "@link-leagues/types";

interface LigasCarouselProps {
  ligas: Liga[];
}

export function LigasCarousel({ ligas }: LigasCarouselProps) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (ligas.length === 0) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % ligas.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [ligas.length]);

  function irPara(index: number) {
    clearInterval(timerRef.current);
    setCurrentIndex((index + ligas.length) % ligas.length);
    timerRef.current = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % ligas.length);
    }, 4000);
  }

  if (ligas.length === 0) return null;

  const liga = ligas[currentIndex];

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-sm">
      {/* Slide */}
      <div
        className="relative h-52 cursor-pointer"
        style={{ background: "linear-gradient(135deg, #10284E 0%, #546484 100%)" }}
        onClick={() => navigate(`/ligas/${liga.id}`)}
      >
        {liga.imagem_url && (
          <img
            src={liga.imagem_url}
            alt={liga.nome}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/40 to-transparent" />

        {/* Seta esquerda */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            irPara(currentIndex - 1);
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 rounded-full p-1.5 text-white transition-colors backdrop-blur-sm"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Seta direita */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            irPara(currentIndex + 1);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 rounded-full p-1.5 text-white transition-colors backdrop-blur-sm"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Conteúdo */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
          <div>
            <h2 className="font-display font-bold text-white text-lg leading-tight">{liga.nome}</h2>
            <p className="text-white/60 text-xs mt-0.5">
              Diretor:{" "}
              {liga.diretores && liga.diretores.length > 0
                ? liga.diretores.map((d) => d.nome).join(", ")
                : "—"}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-center">
              <div className="text-brand-yellow font-bold text-sm">78</div>
              <div className="text-white/70 text-xs">Score</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-center">
              <div className="text-brand-yellow font-bold text-sm">{liga.projetos_ativos ?? 0}</div>
              <div className="text-white/70 text-xs">Projetos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 py-3 bg-white border-t border-border">
        {ligas.map((_, i) => (
          <button
            key={i}
            onClick={() => irPara(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentIndex ? "w-4 bg-navy" : "w-1.5 bg-slate-200 hover:bg-slate-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/home/LigasCarousel.tsx
git commit -m "feat: extract LigasCarousel component with refined visual design"
```

---

## Task 4: MinhaLigaCard component

**Files:**

- Create: `apps/web/src/pages/home/MinhaLigaCard.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/pages/home/MinhaLigaCard.tsx`:

```tsx
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import type { Liga } from "@link-leagues/types";

interface MinhaLigaCardProps {
  liga: Liga;
}

export function MinhaLigaCard({ liga }: MinhaLigaCardProps) {
  const navigate = useNavigate();

  const stats = [
    { valor: "78", label: "Score", cor: "text-amber-500" },
    { valor: String(liga.projetos_ativos ?? 0), label: "Projetos", cor: "text-navy" },
    { valor: "—", label: "Presença", cor: "text-green-600" },
    { valor: "—", label: "Próx. Evento", cor: "text-navy" },
  ];

  return (
    <Card className="overflow-hidden shadow-sm">
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: "linear-gradient(90deg, #10284E, #546484)" }}
      >
        <div>
          <h3 className="font-bold text-white text-sm">{liga.nome}</h3>
          <p className="text-white/60 text-xs mt-0.5">
            Diretor:{" "}
            {liga.diretores && liga.diretores.length > 0
              ? liga.diretores.map((d) => d.nome).join(", ")
              : "—"}
          </p>
        </div>
        <button
          onClick={() => navigate(`/ligas/${liga.id}`)}
          className="bg-brand-yellow text-navy text-xs font-bold px-3 py-1.5 rounded-md hover:bg-brand-yellow/90 transition-colors"
        >
          Ver detalhes →
        </button>
      </div>
      <div className="grid grid-cols-4 divide-x divide-border bg-white">
        {stats.map(({ valor, label, cor }) => (
          <div key={label} className="px-3 py-3 text-center">
            <div className={`font-bold text-xl leading-none ${cor}`}>{valor}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1.5">
              {label}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/home/MinhaLigaCard.tsx
git commit -m "feat: add MinhaLigaCard component with refined stats display"
```

---

## Task 5: RankingLigas component

**Files:**

- Create: `apps/web/src/pages/home/RankingLigas.tsx`

Shared between `HomeDiretorView` and `HomeMembroView`. Uses `Progress` from shadcn. Normalizes progress bar against `maxScore`.

- [ ] **Step 1: Create the component**

Create `apps/web/src/pages/home/RankingLigas.tsx`:

```tsx
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface RankingItem {
  id: string;
  nome: string;
  score: number;
  minhaLiga: boolean;
}

interface RankingLigasProps {
  ranking: RankingItem[];
}

export function RankingLigas({ ranking }: RankingLigasProps) {
  const maxScore = Math.max(...ranking.map((r) => r.score), 1);

  return (
    <Card className="overflow-hidden shadow-sm">
      {ranking.map((r, i) => (
        <div
          key={r.id}
          className={cn(
            "flex items-center gap-3 px-4 py-3",
            i < ranking.length - 1 && "border-b border-border",
            r.minhaLiga && "bg-navy/5",
          )}
        >
          <span
            className={cn(
              "text-xs font-bold w-5 text-center shrink-0",
              r.minhaLiga ? "text-navy" : "text-muted-foreground",
            )}
          >
            {i + 1}º
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={cn(
                  "text-sm font-semibold truncate",
                  r.minhaLiga ? "text-navy" : "text-slate-700",
                )}
              >
                {r.nome}
                {r.minhaLiga && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold bg-navy text-white px-1.5 py-0.5 rounded-full align-middle">
                    <Trophy className="h-2.5 w-2.5" />
                    minha
                  </span>
                )}
              </span>
              <span className="text-xs font-bold text-navy/70 ml-3 shrink-0">{r.score} pts</span>
            </div>
            <Progress
              value={Math.round((r.score / maxScore) * 100)}
              className={cn("h-1.5", r.minhaLiga ? "[&>div]:bg-navy" : "[&>div]:bg-slate-300")}
            />
          </div>
        </div>
      ))}
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/home/RankingLigas.tsx
git commit -m "feat: add shared RankingLigas component using shadcn Progress"
```

---

## Task 6: HomeStaffView

**Files:**

- Create: `apps/web/src/pages/home/HomeStaffView.tsx`

Sections (in order): Destaques da semana → Métricas globais → Alertas → Ranking de presença → Engajamento global.

- [ ] **Step 1: Create the view**

Create `apps/web/src/pages/home/HomeStaffView.tsx`:

```tsx
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  FolderKanban,
  Activity,
  AlertTriangle,
  CalendarX,
  Clock,
  TrendingUp,
  CheckCircle2,
  Medal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { KpiCard } from "./KpiCard";
import { cn } from "@/lib/utils";

// ─── mock data ────────────────────────────────────────────────────────────────

const METRICAS_STAFF = [
  { label: "Ligas ativas", valor: "4", Icon: Users, trend: "↑ +1 este mês", trendType: "up" },
  { label: "Membros", valor: "96", Icon: UserCheck, trend: "↑ +5 este mês", trendType: "up" },
  {
    label: "Projetos ativos",
    valor: "8",
    Icon: FolderKanban,
    trend: "↔ estável",
    trendType: "neutral",
  },
  { label: "Engajamento geral", valor: "78%", Icon: Activity, trend: "↑ +3%", trendType: "up" },
] as const;

const METRICAS_ENGAJAMENTO = [
  { label: "Média de presença", valor: "71%", trendType: "neutral" as const },
  { label: "Reuniões no mês", valor: "14", trendType: "up" as const },
  { label: "Eventos ativos", valor: "3", trendType: "up" as const },
  { label: "Receita total", valor: "R$ 8.700", trendType: "up" as const },
];

const ALERTAS_STAFF = [
  {
    id: "s1",
    titulo: "Liga RH",
    descricao: "Engajamento em 32% — abaixo do mínimo",
    rota: "/gerenciamento",
    Icon: Activity,
    tipo: "urgente",
  },
  {
    id: "s3",
    titulo: "Liga Marketing",
    descricao: "Sem reunião registrada há 2 semanas",
    rota: "/gerenciamento",
    Icon: CalendarX,
    tipo: "atencao",
  },
];

const RANKING_PRESENCA = [
  { id: "p1", nome: "Liga Tech", presenca: 94 },
  { id: "p2", nome: "Link Finance", presenca: 87 },
  { id: "p3", nome: "Marketing", presenca: 72 },
  { id: "p4", nome: "RH", presenca: 32 },
];

const DESTAQUES_MOCK = [
  {
    id: "1",
    Icon: TrendingUp,
    label: "SCORE",
    titulo: "Liga de Marketing",
    sub: "+12pts essa semana",
  },
  {
    id: "2",
    Icon: CheckCircle2,
    label: "PROJETO",
    titulo: "Análise de Mercado",
    sub: "Concluído ontem",
  },
  {
    id: "3",
    Icon: Medal,
    label: "RANKING",
    titulo: "#1 Liga de Finanças",
    sub: "Lidera a temporada",
  },
];

// ─── component ────────────────────────────────────────────────────────────────

interface HomeStaffViewProps {
  pendentes: {
    projetos: { id: string; titulo: string; liga?: { nome: string } }[];
    eventos: { id: string; titulo: string; liga?: { nome: string } }[];
  };
}

export function HomeStaffView({ pendentes }: HomeStaffViewProps) {
  const navigate = useNavigate();

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
              <CalendarX className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
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
                const baixa = r.presenca < 50;
                const media = r.presenca < 70;
                const barClass = baixa
                  ? "[&>div]:bg-red-500"
                  : media
                    ? "[&>div]:bg-amber-500"
                    : "[&>div]:bg-green-500";
                return (
                  <TableRow key={r.id} className={baixa ? "bg-red-50" : undefined}>
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
                        {r.presenca}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Progress value={r.presenca} className={cn("h-1.5 w-28", barClass)} />
                    </TableCell>
                  </TableRow>
                );
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
            <KpiCard key={m.label} label={m.label} value={m.valor} trendType={m.trendType} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck 2>&1 | head -30
```

Expected: no errors in `HomeStaffView.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/home/HomeStaffView.tsx
git commit -m "feat: add HomeStaffView with Card, Table, Progress, and Badge components"
```

---

## Task 7: HomeDiretorView

**Files:**

- Create: `apps/web/src/pages/home/HomeDiretorView.tsx`

Uses `Tabs` (shadcn) as the Minha Liga / Visão Global toggle. Visao state is local to this view.

- [ ] **Step 1: Create the view**

Create `apps/web/src/pages/home/HomeDiretorView.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "./KpiCard";
import { RankingLigas, type RankingItem } from "./RankingLigas";

// ─── mock data ────────────────────────────────────────────────────────────────

const METRICAS_MINHA_LIGA = [
  { label: "Projetos ativos", valor: "3", trend: "↑ +1", trendType: "up" as const },
  { label: "Receita", valor: "R$ 2.000", trend: "↑ este mês", trendType: "up" as const },
  { label: "Membros", valor: "24", trend: "↔ estável", trendType: "neutral" as const },
  { label: "Score", valor: "840 pts", trend: "↑ +12pts", trendType: "up" as const },
];

const METRICAS_GLOBAL = [
  { label: "Projetos ativos", valor: "12", trend: "↑ +3", trendType: "up" as const },
  { label: "Receita total", valor: "R$ 8.700", trend: "↑ este mês", trendType: "up" as const },
  { label: "Membros", valor: "94", trend: "↑ +5", trendType: "up" as const },
  { label: "Score médio", valor: "663 pts", trend: "↔ estável", trendType: "neutral" as const },
];

const ALERTAS_MOCK = [
  { id: "a1", projeto: "App de presenças", motivo: "recusado pelo professor" },
  { id: "a2", projeto: "Dashboard financeiro", motivo: "aguardando Staff há 3 dias" },
];

const SALA_MOCK = { sala: "Sala 204", data: "Sex 18/04", horario: "19h" };

const RANKING_MOCK: RankingItem[] = [
  { id: "r1", nome: "Liga Tech", score: 840, minhaLiga: true },
  { id: "r2", nome: "Link Finance", score: 710, minhaLiga: false },
  { id: "r3", nome: "Marketing", score: 620, minhaLiga: false },
  { id: "r4", nome: "RH", score: 480, minhaLiga: false },
];

// ─── component ────────────────────────────────────────────────────────────────

export function HomeDiretorView() {
  const navigate = useNavigate();
  const [visao, setVisao] = useState<"minha" | "global">("minha");

  const metricas = visao === "minha" ? METRICAS_MINHA_LIGA : METRICAS_GLOBAL;

  return (
    <div className="space-y-6">
      {/* Toggle Minha Liga / Visão Global */}
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

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-3">
        {metricas.map((m) => (
          <KpiCard
            key={m.label}
            label={m.label}
            value={m.valor}
            trend={m.trend}
            trendType={m.trendType}
          />
        ))}
      </div>

      {/* Alertas — apenas "Minha Liga" */}
      {visao === "minha" && ALERTAS_MOCK.length > 0 && (
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
            {ALERTAS_MOCK.map((a) => (
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

      {/* Próxima sala reservada — apenas "Minha Liga" */}
      {visao === "minha" && SALA_MOCK && (
        <div>
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
            Próxima Sala Reservada
          </p>
          <Card className="shadow-sm">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg border border-border flex items-center justify-center font-bold text-sm text-navy bg-slate-50 shrink-0">
                {SALA_MOCK.sala.replace("Sala ", "")}
              </div>
              <div>
                <p className="text-sm font-semibold text-navy flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {SALA_MOCK.sala}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {SALA_MOCK.data} às {SALA_MOCK.horario}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ranking geral — sempre visível */}
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Ranking Geral
        </p>
        <RankingLigas ranking={RANKING_MOCK} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/home/HomeDiretorView.tsx
git commit -m "feat: add HomeDiretorView with Tabs toggle and RankingLigas"
```

---

## Task 8: HomeProfessorView

**Files:**

- Create: `apps/web/src/pages/home/HomeProfessorView.tsx`

Includes paginated approval queue table (5 per page) and upcoming events list.

- [ ] **Step 1: Create the view**

Create `apps/web/src/pages/home/HomeProfessorView.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { KpiCard } from "./KpiCard";

// ─── mock data ────────────────────────────────────────────────────────────────

const METRICAS_PROFESSOR = [
  { label: "Score", valor: "840 pts", trend: "↑ +12pts", trendType: "up" as const },
  { label: "Projetos ativos", valor: "5", trend: "↔ estável", trendType: "neutral" as const },
  { label: "Membros", valor: "24", trend: "↑ +2", trendType: "up" as const },
  { label: "Frequência", valor: "87%", trend: "↑ +3%", trendType: "up" as const },
];

const FILA_PROFESSOR = [
  { id: "f1", nome: "App de presenças", diasAguardando: 9 },
  { id: "f2", nome: "API de integração", diasAguardando: 2 },
  { id: "f3", nome: "Sistema de feedback", diasAguardando: 1 },
];

const EVENTOS_PROFESSOR = [
  { id: "e1", nome: "Reunião semanal", data: "Sex 18/04", hora: "19h" },
  { id: "e2", nome: "Workshop de produto", data: "Ter 22/04", hora: "18h" },
];

const PER_PAGE = 5;

// ─── component ────────────────────────────────────────────────────────────────

export function HomeProfessorView() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(FILA_PROFESSOR.length / PER_PAGE);
  const filaPaginada = FILA_PROFESSOR.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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
                      className={
                        page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                      }
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
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/home/HomeProfessorView.tsx
git commit -m "feat: add HomeProfessorView with paginated approval table"
```

---

## Task 9: HomeMembroView

**Files:**

- Create: `apps/web/src/pages/home/HomeMembroView.tsx`

- [ ] **Step 1: Create the view**

Create `apps/web/src/pages/home/HomeMembroView.tsx`:

```tsx
import { KpiCard } from "./KpiCard";
import { RankingLigas, type RankingItem } from "./RankingLigas";

// ─── mock data ────────────────────────────────────────────────────────────────

const METRICAS_MEMBRO = [
  { label: "Meu score", valor: "72 pts", trend: "↑ +5pts", trendType: "up" as const },
  { label: "Minha frequência", valor: "87%", trend: "↑ +2%", trendType: "up" as const },
  {
    label: "Projetos que participo",
    valor: "2",
    trend: "↔ estável",
    trendType: "neutral" as const,
  },
  { label: "Próxima reunião", valor: "Sex 18/04", trend: "às 19h", trendType: "neutral" as const },
];

const RANKING_MEMBRO: RankingItem[] = [
  { id: "r1", nome: "Liga Tech", score: 840, minhaLiga: true },
  { id: "r2", nome: "Link Finance", score: 710, minhaLiga: false },
  { id: "r3", nome: "Marketing", score: 620, minhaLiga: false },
  { id: "r4", nome: "RH", score: 480, minhaLiga: false },
];

// ─── component ────────────────────────────────────────────────────────────────

export function HomeMembroView() {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Meu Desempenho
        </p>
        <div className="grid grid-cols-4 gap-3">
          {METRICAS_MEMBRO.map((m) => (
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

      {/* Ranking geral */}
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Ranking Geral
        </p>
        <RankingLigas ranking={RANKING_MEMBRO} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/home/HomeMembroView.tsx
git commit -m "feat: add HomeMembroView with KPI cards and league ranking"
```

---

## Task 10: Rewrite HomePage.tsx

**Files:**

- Modify: `apps/web/src/pages/home/HomePage.tsx`

Thin coordinator: data fetching + header + global sections (Carrossel, MinhaLigaCard) + role dispatch.

- [ ] **Step 1: Replace the entire file**

Replace `apps/web/src/pages/home/HomePage.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Liga } from "@link-leagues/types";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LigasCarousel } from "./LigasCarousel";
import { MinhaLigaCard } from "./MinhaLigaCard";
import { HomeStaffView } from "./HomeStaffView";
import { HomeDiretorView } from "./HomeDiretorView";
import { HomeProfessorView } from "./HomeProfessorView";
import { HomeMembroView } from "./HomeMembroView";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const ROLE_LABELS: Record<string, string> = {
  staff: "Staff",
  diretor: "Diretor",
  professor: "Professor",
  membro: "Membro",
  estudante: "Estudante",
};

export function HomePage() {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [minhaLiga, setMinhaLiga] = useState<Liga | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState<string>("");
  const [role, setRole] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [pendentes, setPendentes] = useState<{
    projetos: { id: string; titulo: string; liga?: { nome: string } }[];
    eventos: { id: string; titulo: string; liga?: { nome: string } }[];
  }>({ projetos: [], eventos: [] });

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user.email ?? "";

      if (email) {
        const { data: usuario } = await supabase
          .from("usuarios")
          .select("nome, role")
          .eq("email", email)
          .single();
        if (usuario?.nome) setNomeUsuario(usuario.nome as string);
        else setNomeUsuario(email.split("@")[0] ?? "Usuário");
        if (usuario?.role) setRole(usuario.role as string);

        if (usuario?.role === "staff") {
          const res = await fetch("/api/pendentes", { headers });
          if (res.ok) setPendentes(await res.json());
        }
      }
      setLoadingUser(false);

      const [ligasRes, minhaRes] = await Promise.all([
        fetch("/api/ligas", { headers }),
        fetch("/api/ligas/minha", { headers }),
      ]);
      if (ligasRes.ok) setLigas(await ligasRes.json());
      if (minhaRes.ok) setMinhaLiga(await minhaRes.json());
    }
    carregar();
  }, []);

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  // Capitalize first letter
  const dataFormatada = hoje.charAt(0).toUpperCase() + hoje.slice(1);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {loadingUser ? (
            <>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </>
          ) : (
            <>
              <h1 className="font-display font-bold text-2xl text-navy">Olá, {nomeUsuario}</h1>
              <p className="text-muted-foreground text-sm mt-1">{dataFormatada}</p>
            </>
          )}
        </div>
        {role && !loadingUser && (
          <Badge
            variant="outline"
            className="border-navy/30 text-navy bg-navy/5 font-semibold mt-1"
          >
            {ROLE_LABELS[role] ?? role}
          </Badge>
        )}
      </div>

      {/* Carrossel de ligas */}
      {ligas.length > 0 && <LigasCarousel ligas={ligas} />}

      {/* Minha Liga */}
      {minhaLiga && (
        <div>
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-2">
            Minha Liga
          </p>
          <MinhaLigaCard liga={minhaLiga} />
        </div>
      )}

      {/* View por papel */}
      {role === "staff" && <HomeStaffView pendentes={pendentes} />}
      {role === "diretor" && <HomeDiretorView />}
      {role === "professor" && <HomeProfessorView />}
      {role === "membro" && <HomeMembroView />}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "error|warning" | head -30
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/home/HomePage.tsx
git commit -m "refactor: rewrite HomePage as thin role-router with refined Corporativo Premium design"
```

---

## Task 11: Visual verification

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Open browser at http://localhost:3000/home**

Visually check for each role (switch role via Supabase or mock if needed):

| Role      | Check                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------ |
| staff     | KPI cards 4 cols, Destaques 3 cols, Alertas com ícones, Tabela de presença com Progress, Badge "baixa" |
| diretor   | Tabs toggle funciona, KPI cards mudam, Alertas/Sala visíveis só em "Minha", Ranking aparece            |
| professor | KPI 4 cols, Tabela de aprovação com badges de urgência, Botão "Revisar", Eventos                       |
| membro    | KPI 4 cols, Ranking com destaque da liga própria                                                       |
| loading   | Header mostra Skeleton nos campos de nome e subtítulo                                                  |

- [ ] **Step 3: Check carousel auto-advance**

Aguardar 4 segundos — o slide deve avançar automaticamente. Testar as setas laterais.

- [ ] **Step 4: Final typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.
