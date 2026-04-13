# Home Page + Página de Liga (Membro) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a Home Page com carrossel de ligas + card "Minha Liga", e a página `/ligas/:id` com 6 sub-abas (Visão Geral, Líder, Membros, Presença, Projetos, Recursos).

**Architecture:** A Home Page tem 3 zonas verticais: carrossel full-width com auto-avanço 1,5s, card da liga do membro e destaques fictícios. A página de detalhe usa React state para controle de aba ativa, cada aba é um componente independente que busca seus próprios dados via API. Dados fictícios (score, faturamento, destaques, recursos) são hardcoded com comentários TODO para integração futura.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + shadcn/ui · Express + postgres.js (`sql` tag) · Supabase Auth · pnpm monorepo

---

## Estrutura de Arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `packages/types/src/recurso.ts` | Criar | Tipo `Recurso` |
| `packages/types/src/index.ts` | Modificar | Re-exportar `Recurso` |
| `apps/api/src/routes/ligas.ts` | Modificar | Novos endpoints: `/minha`, `/:id/membros`, `/:id/projetos`, `/:id/presenca`, `/:id/eventos/proximo` |
| `apps/web/src/router/index.tsx` | Modificar | Adicionar rota `/ligas/:id` |
| `apps/web/src/pages/home/HomePage.tsx` | Reescrever | 3 zonas: carrossel + minha liga + destaques |
| `apps/web/src/pages/ligas/LigaDetailPage.tsx` | Criar | Hero + tabs shell |
| `apps/web/src/pages/ligas/tabs/VisaoGeralTab.tsx` | Criar | 4 métricas + próximo evento |
| `apps/web/src/pages/ligas/tabs/LiderTab.tsx` | Criar | Perfil líder + diretores |
| `apps/web/src/pages/ligas/tabs/MembrosTab.tsx` | Criar | Tabela de membros |
| `apps/web/src/pages/ligas/tabs/PresencaTab.tsx` | Criar | Tabela de presenças |
| `apps/web/src/pages/ligas/tabs/ProjetosTab.tsx` | Criar | Lista de projetos |
| `apps/web/src/pages/ligas/tabs/RecursosTab.tsx` | Criar | Links mock (TODO: API) |

---

## Task 1: Adicionar tipo `Recurso` nos pacotes compartilhados

**Files:**
- Create: `packages/types/src/recurso.ts`
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Criar `packages/types/src/recurso.ts`**

```typescript
export type TipoRecurso = "curso" | "video" | "documento" | "link";

export interface Recurso {
  id: string;
  liga_id: string;
  titulo: string;
  tipo: TipoRecurso;
  url: string;
  criado_por?: string;
  criado_em: string;
}
```

- [ ] **Step 2: Exportar `Recurso` de `packages/types/src/index.ts`**

Adicionar no final do arquivo:
```typescript
export * from "./recurso.js";
```

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/recurso.ts packages/types/src/index.ts
git commit -m "feat(types): add Recurso type"
```

---

## Task 2: Adicionar endpoints na API

**Files:**
- Modify: `apps/api/src/routes/ligas.ts`

> Todos os novos routes devem ser adicionados **antes** do `GET /:id` existente (linha 52), pois `GET /minha` seria capturado por `/:id` se vier depois.

- [ ] **Step 1: Adicionar `GET /ligas/minha` — retorna a liga do usuário autenticado**

Inserir logo ANTES da linha `// GET /ligas/:id`:

```typescript
// GET /ligas/minha — liga do usuário autenticado (via liga_membros ou lider_id)
ligasRouter.get("/minha", authenticate, async (req, res, next) => {
  try {
    const email = req.user!.email;
    const [liga] = await sql`
      SELECT l.*, lu.email AS lider_email
      FROM ligas l
      LEFT JOIN usuarios lu ON lu.id = l.lider_id
      WHERE l.ativo = true
        AND (
          l.lider_id = (SELECT id FROM usuarios WHERE email = ${email})
          OR EXISTS (
            SELECT 1 FROM liga_membros lm
            JOIN usuarios u ON u.id = lm.usuario_id
            WHERE lm.liga_id = l.id AND u.email = ${email}
          )
        )
      LIMIT 1
    `;
    if (!liga) { res.status(404).json({ error: "Liga não encontrada." }); return; }
    res.json(liga);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 2: Adicionar `GET /ligas/:id/membros`**

Inserir após o `GET /:id` existente:

```typescript
// GET /ligas/:id/membros — membros da liga com cargo e data de ingresso
ligasRouter.get("/:id/membros", authenticate, async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const membros = await sql`
      SELECT
        lm.id, lm.usuario_id, lm.cargo, lm.ingressou_em,
        u.nome, u.email
      FROM liga_membros lm
      JOIN usuarios u ON u.id = lm.usuario_id
      WHERE lm.liga_id = ${id}
      ORDER BY lm.ingressou_em ASC
    `;
    res.json(membros);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 3: Adicionar `GET /ligas/:id/projetos`**

```typescript
// GET /ligas/:id/projetos — projetos da liga
ligasRouter.get("/:id/projetos", authenticate, async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const projetos = await sql`
      SELECT p.*, u.nome AS responsavel_nome
      FROM projetos p
      LEFT JOIN usuarios u ON u.id = p.responsavel_id
      WHERE p.liga_id = ${id}
      ORDER BY p.criado_em DESC
    `;
    res.json(projetos);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 4: Adicionar `GET /ligas/:id/presenca`**

```typescript
// GET /ligas/:id/presenca — registros de presença agrupados por evento
ligasRouter.get("/:id/presenca", authenticate, async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const registros = await sql`
      SELECT
        e.id AS evento_id,
        e.titulo AS evento_titulo,
        e.data AS evento_data,
        pr.id,
        pr.usuario_id,
        pr.status,
        pr.justificativa,
        u.nome AS usuario_nome
      FROM eventos e
      LEFT JOIN presencas pr ON pr.evento_id = e.id
      LEFT JOIN usuarios u ON u.id = pr.usuario_id
      WHERE e.liga_id = ${id}
      ORDER BY e.data DESC
    `;
    res.json(registros);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 5: Adicionar `GET /ligas/:id/eventos/proximo`**

```typescript
// GET /ligas/:id/eventos/proximo — próximo evento futuro da liga
ligasRouter.get("/:id/eventos/proximo", authenticate, async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const [evento] = await sql`
      SELECT * FROM eventos
      WHERE liga_id = ${id} AND data > NOW()
      ORDER BY data ASC
      LIMIT 1
    `;
    if (!evento) { res.status(404).json({ error: "Nenhum evento futuro." }); return; }
    res.json(evento);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 6: Verificar que `GET /minha` está posicionado ANTES de `GET /:id` no arquivo**

Ordem correta no arquivo:
1. `GET /` (linha 22)
2. `GET /minha` ← deve vir aqui
3. `GET /:id` (linha 52)
4. `POST /:id/imagem`, etc.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/ligas.ts
git commit -m "feat(api): add liga detail endpoints (minha, membros, projetos, presenca, eventos)"
```

---

## Task 3: Registrar rota `/ligas/:id` no router frontend

**Files:**
- Modify: `apps/web/src/router/index.tsx`

- [ ] **Step 1: Importar `LigaDetailPage` e adicionar rota**

Em `apps/web/src/router/index.tsx`, adicionar import:
```typescript
import { LigaDetailPage } from "@/pages/ligas/LigaDetailPage";
```

Adicionar na lista `children` do `AppLayout`:
```typescript
{ path: "ligas/:id", element: <LigaDetailPage /> },
```

O arquivo completo fica:
```typescript
import { createBrowserRouter, Navigate, type RouterProviderProps } from "react-router-dom";

type BrowserRouter = RouterProviderProps["router"];
import { AppLayout } from "@/layouts/AppLayout";
import { HomePage } from "@/pages/home/HomePage";
import { LigasPage } from "@/pages/ligas/LigasPage";
import { LigaDetailPage } from "@/pages/ligas/LigaDetailPage";
import { ProjetosPage } from "@/pages/projetos/ProjetosPage";
import { AgendaPage } from "@/pages/agenda/AgendaPage";
import { ConteudoPage } from "@/pages/conteudo/ConteudoPage";
import { SuperAdminPage } from "@/pages/super-admin/SuperAdminPage";
import { GerenciamentoPage } from "@/pages/gerenciamento/GerenciamentoPage";
import { ContaPage } from "@/pages/conta/ContaPage";

export const router: BrowserRouter = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/home" replace />,
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "home", element: <HomePage /> },
      { path: "ligas", element: <LigasPage /> },
      { path: "ligas/:id", element: <LigaDetailPage /> },
      { path: "projetos", element: <ProjetosPage /> },
      { path: "agenda", element: <AgendaPage /> },
      { path: "conteudo", element: <ConteudoPage /> },
      { path: "super-admin", element: <SuperAdminPage /> },
      { path: "gerenciamento", element: <GerenciamentoPage /> },
      { path: "conta", element: <ContaPage /> },
    ],
  },
]);
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/router/index.tsx
git commit -m "feat(router): add /ligas/:id route"
```

---

## Task 4: Criar `LigaDetailPage` — shell com hero e tabs

**Files:**
- Create: `apps/web/src/pages/ligas/LigaDetailPage.tsx`

- [ ] **Step 1: Criar o arquivo `LigaDetailPage.tsx`**

```typescript
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Liga } from "@link-leagues/types";
import { supabase } from "@/lib/supabase";
import { VisaoGeralTab } from "./tabs/VisaoGeralTab";
import { LiderTab } from "./tabs/LiderTab";
import { MembrosTab } from "./tabs/MembrosTab";
import { PresencaTab } from "./tabs/PresencaTab";
import { ProjetosTab } from "./tabs/ProjetosTab";
import { RecursosTab } from "./tabs/RecursosTab";

type AbaId = "visao-geral" | "lider" | "membros" | "presenca" | "projetos" | "recursos";

const ABAS: { id: AbaId; label: string }[] = [
  { id: "visao-geral", label: "Visão Geral" },
  { id: "lider", label: "Líder" },
  { id: "membros", label: "Membros" },
  { id: "presenca", label: "Presença" },
  { id: "projetos", label: "Projetos" },
  { id: "recursos", label: "Recursos" },
];

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function LigaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [liga, setLiga] = useState<Liga | null>(null);
  const [minhaLigaId, setMinhaLigaId] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("visao-geral");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [ligaRes, minhaRes] = await Promise.all([
        fetch(`/api/ligas/${id}`, { headers }),
        fetch("/api/ligas/minha", { headers }),
      ]);

      if (ligaRes.ok) setLiga(await ligaRes.json());
      if (minhaRes.ok) {
        const minha = await minhaRes.json() as Liga;
        setMinhaLigaId(minha.id);
      }
      setCarregando(false);
    }
    carregar();
  }, [id]);

  if (carregando) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando...</div>;
  }
  if (!liga) {
    return <div className="p-8 text-sm text-muted-foreground">Liga não encontrada.</div>;
  }

  const ehMinhaLiga = minhaLigaId === liga.id;
  const membros = (liga as Liga & { membros?: unknown[] }).membros ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Hero */}
      <div
        className="relative flex-shrink-0"
        style={{ height: "112px", background: "linear-gradient(135deg, #10284E 0%, #546484 100%)" }}
      >
        {liga.imagem_url && (
          <img
            src={liga.imagem_url}
            alt={liga.nome}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/85 to-transparent" />

        <button
          onClick={() => navigate("/home")}
          className="absolute top-3 left-4 z-10 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-md"
        >
          ← Home
        </button>

        <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-3 flex items-end justify-between">
          <div>
            <h1 className="font-display font-bold text-lg text-white leading-tight">{liga.nome}</h1>
            <p className="text-xs text-white/70 mt-0.5">
              Líder: {liga.lider_email ?? "—"} · {membros.length} membros
            </p>
          </div>
          {ehMinhaLiga && (
            <span className="bg-brand-yellow text-navy text-xs font-bold px-3 py-1 rounded-md">
              Minha Liga
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-brand-gray flex overflow-x-auto flex-shrink-0 px-2">
        {ABAS.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={
              abaAtiva === aba.id
                ? "px-4 py-3 text-xs font-bold text-navy border-b-2 border-navy whitespace-nowrap"
                : "px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-navy whitespace-nowrap border-b-2 border-transparent transition-colors"
            }
          >
            {aba.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      <div className="flex-1 overflow-y-auto p-6">
        {abaAtiva === "visao-geral" && <VisaoGeralTab ligaId={liga.id} />}
        {abaAtiva === "lider" && <LiderTab liga={liga} />}
        {abaAtiva === "membros" && <MembrosTab ligaId={liga.id} />}
        {abaAtiva === "presenca" && <PresencaTab ligaId={liga.id} />}
        {abaAtiva === "projetos" && <ProjetosTab ligaId={liga.id} />}
        {abaAtiva === "recursos" && <RecursosTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Criar pasta de tabs**

```bash
mkdir -p apps/web/src/pages/ligas/tabs
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/ligas/LigaDetailPage.tsx
git commit -m "feat(web): add LigaDetailPage shell with hero and tab navigation"
```

---

## Task 5: Criar `VisaoGeralTab`

**Files:**
- Create: `apps/web/src/pages/ligas/tabs/VisaoGeralTab.tsx`

- [ ] **Step 1: Criar o arquivo**

```typescript
import { useEffect, useState } from "react";
import type { Projeto, Evento } from "@link-leagues/types";
import { supabase } from "@/lib/supabase";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

interface Props {
  ligaId: string;
}

function MetricCard({
  icon,
  value,
  label,
  sub,
  valueClass = "text-navy",
}: {
  icon: string;
  value: string;
  label: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white border border-brand-gray rounded-lg p-3 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-xl font-bold ${valueClass}`}>{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
      <div className="text-xs text-muted-foreground/60 mt-0.5">{sub}</div>
    </div>
  );
}

export function VisaoGeralTab({ ligaId }: Props) {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [presencaPercent, setPresencaPercent] = useState<number | null>(null);
  const [proximoEvento, setProximoEvento] = useState<Evento | null>(null);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [projetosRes, presencaRes, eventoRes] = await Promise.all([
        fetch(`/api/ligas/${ligaId}/projetos`, { headers }),
        fetch(`/api/ligas/${ligaId}/presenca`, { headers }),
        fetch(`/api/ligas/${ligaId}/eventos/proximo`, { headers }),
      ]);

      if (projetosRes.ok) setProjetos(await projetosRes.json());

      if (presencaRes.ok) {
        const registros = (await presencaRes.json()) as { status: string }[];
        const total = registros.filter((r) => r.status !== null).length;
        if (total > 0) {
          const presentes = registros.filter((r) => r.status === "presente").length;
          setPresencaPercent(Math.round((presentes / total) * 100));
        }
      }

      if (eventoRes.ok) setProximoEvento(await eventoRes.json());
    }
    carregar();
  }, [ligaId]);

  const projetosAtivos = projetos.filter((p) => p.status === "em_andamento").length;
  // Valores fictícios — substituir quando campos forem implementados
  const score = 78;
  const faturamentoPorMembro = "R$420";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Métricas da Liga
        </p>
        <div className="grid grid-cols-4 gap-3">
          <MetricCard
            icon="📁"
            value={String(projetosAtivos)}
            label="Proj. Ativos"
            sub="em andamento"
          />
          <MetricCard
            icon="⭐"
            value={String(score)}
            label="Score"
            sub="valor fictício"
            valueClass="text-amber-500"
          />
          <MetricCard
            icon="✅"
            value={presencaPercent !== null ? `${presencaPercent}%` : "—"}
            label="Presença"
            sub="média da liga"
            valueClass="text-green-600"
          />
          <MetricCard
            icon="💰"
            value={faturamentoPorMembro}
            label="Fat./Membro"
            sub="valor fictício"
            valueClass="text-link-blue"
          />
        </div>
      </div>

      {proximoEvento && (
        <div>
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
            Próximo Evento
          </p>
          <div className="bg-white border border-brand-gray rounded-lg p-4 flex items-center gap-4">
            <div className="bg-navy text-white rounded-lg px-4 py-3 text-center flex-shrink-0">
              <div className="text-2xl font-bold leading-none">
                {new Date(proximoEvento.data).getDate()}
              </div>
              <div className="text-xs opacity-70 uppercase mt-1">
                {new Date(proximoEvento.data).toLocaleString("pt-BR", { month: "short" })}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-navy text-sm">{proximoEvento.titulo}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(proximoEvento.data).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                {" · "}
                {new Date(proximoEvento.data).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {proximoEvento.descricao && (
                <p className="text-xs text-muted-foreground mt-0.5">{proximoEvento.descricao}</p>
              )}
              <span className="inline-block mt-2 bg-amber-50 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-md">
                em breve
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/ligas/tabs/VisaoGeralTab.tsx
git commit -m "feat(web): add VisaoGeralTab with metrics and next event"
```

---

## Task 6: Criar `LiderTab`

**Files:**
- Create: `apps/web/src/pages/ligas/tabs/LiderTab.tsx`

- [ ] **Step 1: Criar o arquivo**

```typescript
import type { Liga } from "@link-leagues/types";

interface Props {
  liga: Liga;
}

export function LiderTab({ liga }: Props) {
  const diretores = liga.diretores ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Líder da Liga
        </p>
        <div className="bg-white border border-brand-gray rounded-lg p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-navy to-link-blue flex-shrink-0" />
          <div>
            <div className="font-bold text-navy text-sm">
              {liga.lider?.nome ?? liga.lider_email ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{liga.lider_email}</div>
          </div>
        </div>
      </div>

      {diretores.length > 0 && (
        <div>
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
            Diretores
          </p>
          <div className="flex flex-col gap-2">
            {diretores.map((d) => (
              <div
                key={d.id}
                className="bg-white border border-brand-gray rounded-lg p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-link-blue flex-shrink-0" />
                <div className="font-semibold text-navy text-sm">{d.nome}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {diretores.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum diretor cadastrado.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/ligas/tabs/LiderTab.tsx
git commit -m "feat(web): add LiderTab"
```

---

## Task 7: Criar `MembrosTab`

**Files:**
- Create: `apps/web/src/pages/ligas/tabs/MembrosTab.tsx`

- [ ] **Step 1: Criar o arquivo**

```typescript
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface MembroRow {
  id: string;
  usuario_id: string;
  cargo: string | null;
  ingressou_em: string;
  nome: string;
  email: string;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

interface Props {
  ligaId: string;
}

export function MembrosTab({ ligaId }: Props) {
  const [membros, setMembros] = useState<MembroRow[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${ligaId}/membros`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setMembros(await res.json());
      setCarregando(false);
    }
    carregar();
  }, [ligaId]);

  if (carregando) {
    return <p className="text-sm text-muted-foreground">Carregando membros...</p>;
  }

  return (
    <div>
      <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
        Membros da Liga{" "}
        <span className="bg-brand-gray text-link-blue rounded-full px-2 py-0.5 text-xs font-normal ml-1 normal-case">
          {membros.length}
        </span>
      </p>
      {membros.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
      ) : (
        <div className="bg-white border border-brand-gray rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-gray/50 border-b border-brand-gray">
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-4 py-2">
                  Membro
                </th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-4 py-2">
                  Cargo
                </th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-4 py-2">
                  Ingresso
                </th>
              </tr>
            </thead>
            <tbody>
              {membros.map((m) => (
                <tr key={m.id} className="border-b border-brand-gray last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-navy flex-shrink-0" />
                      <span className="text-sm font-medium text-navy">{m.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {m.cargo ?? "Membro"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(m.ingressou_em).toLocaleDateString("pt-BR", {
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/ligas/tabs/MembrosTab.tsx
git commit -m "feat(web): add MembrosTab"
```

---

## Task 8: Criar `PresencaTab`

**Files:**
- Create: `apps/web/src/pages/ligas/tabs/PresencaTab.tsx`

- [ ] **Step 1: Criar o arquivo**

```typescript
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { StatusPresenca } from "@link-leagues/types";

interface PresencaRow {
  id: string;
  evento_id: string;
  evento_titulo: string;
  evento_data: string;
  usuario_id: string;
  usuario_nome: string;
  status: StatusPresenca;
  justificativa: string | null;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_CONFIG: Record<StatusPresenca, { label: string; className: string }> = {
  presente: { label: "Presente", className: "bg-green-100 text-green-700" },
  ausente: { label: "Ausente", className: "bg-red-100 text-red-700" },
  justificado: { label: "Justificado", className: "bg-yellow-100 text-yellow-700" },
};

interface Props {
  ligaId: string;
}

export function PresencaTab({ ligaId }: Props) {
  const [registros, setRegistros] = useState<PresencaRow[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${ligaId}/presenca`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRegistros(await res.json());
      setCarregando(false);
    }
    carregar();
  }, [ligaId]);

  if (carregando) {
    return <p className="text-sm text-muted-foreground">Carregando presenças...</p>;
  }

  const comStatus = registros.filter((r) => r.status !== null);

  return (
    <div>
      <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
        Presença dos Membros
      </p>
      {comStatus.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum registro de presença encontrado.</p>
      ) : (
        <div className="bg-white border border-brand-gray rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-gray/50 border-b border-brand-gray">
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-4 py-2">
                  Membro
                </th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-4 py-2">
                  Evento
                </th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-4 py-2">
                  Status
                </th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-4 py-2">
                  Justificativa
                </th>
              </tr>
            </thead>
            <tbody>
              {comStatus.map((r) => {
                const s = STATUS_CONFIG[r.status];
                return (
                  <tr key={r.id} className="border-b border-brand-gray last:border-0">
                    <td className="px-4 py-3 text-sm font-medium text-navy">{r.usuario_nome}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.evento_titulo}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${s.className}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {r.justificativa ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/ligas/tabs/PresencaTab.tsx
git commit -m "feat(web): add PresencaTab"
```

---

## Task 9: Criar `ProjetosTab`

**Files:**
- Create: `apps/web/src/pages/ligas/tabs/ProjetosTab.tsx`

- [ ] **Step 1: Criar o arquivo**

```typescript
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Projeto, StatusProjeto } from "@link-leagues/types";

interface ProjetoRow extends Projeto {
  responsavel_nome: string | null;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_CONFIG: Record<StatusProjeto, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-gray-100 text-gray-600" },
  em_aprovacao: { label: "Em aprovação", className: "bg-yellow-100 text-yellow-700" },
  aprovado: { label: "Aprovado", className: "bg-blue-100 text-blue-700" },
  rejeitado: { label: "Rejeitado", className: "bg-red-100 text-red-700" },
  em_andamento: { label: "Em andamento", className: "bg-blue-100 text-blue-700" },
  concluido: { label: "Concluído", className: "bg-green-100 text-green-700" },
  cancelado: { label: "Cancelado", className: "bg-gray-100 text-gray-500" },
};

interface Props {
  ligaId: string;
}

export function ProjetosTab({ ligaId }: Props) {
  const [projetos, setProjetos] = useState<ProjetoRow[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${ligaId}/projetos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProjetos(await res.json());
      setCarregando(false);
    }
    carregar();
  }, [ligaId]);

  if (carregando) {
    return <p className="text-sm text-muted-foreground">Carregando projetos...</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
        Projetos da Liga
      </p>
      {projetos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum projeto cadastrado.</p>
      ) : (
        projetos.map((p) => {
          const s = STATUS_CONFIG[p.status];
          return (
            <div
              key={p.id}
              className="bg-white border border-brand-gray rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-navy text-sm">{p.nome}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Resp: {p.responsavel_nome ?? "—"}
                  {p.prazo
                    ? ` · Prazo: ${new Date(p.prazo).toLocaleDateString("pt-BR")}`
                    : ""}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${s.className}`}>
                  {s.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {p.percentual_concluido}% concluído
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/ligas/tabs/ProjetosTab.tsx
git commit -m "feat(web): add ProjetosTab"
```

---

## Task 10: Criar `RecursosTab`

**Files:**
- Create: `apps/web/src/pages/ligas/tabs/RecursosTab.tsx`

- [ ] **Step 1: Criar o arquivo**

```typescript
import type { TipoRecurso } from "@link-leagues/types";

interface RecursoMock {
  id: string;
  titulo: string;
  tipo: TipoRecurso;
  url: string;
  criado_por: string;
}

const TIPO_CONFIG: Record<TipoRecurso, { icon: string; bgClass: string }> = {
  curso: { icon: "🎓", bgClass: "bg-blue-50" },
  video: { icon: "🎥", bgClass: "bg-yellow-50" },
  documento: { icon: "📄", bgClass: "bg-green-50" },
  link: { icon: "🔗", bgClass: "bg-purple-50" },
};

// TODO: substituir por GET /api/ligas/:id/recursos quando tabela `recursos` for criada
const RECURSOS_MOCK: RecursoMock[] = [
  {
    id: "1",
    titulo: "Marketing Digital — Fundamentos",
    tipo: "curso",
    url: "#",
    criado_por: "Líder da Liga",
  },
  {
    id: "2",
    titulo: "Template de Pitch",
    tipo: "documento",
    url: "#",
    criado_por: "Líder da Liga",
  },
  {
    id: "3",
    titulo: "Aula: Estratégia de Conteúdo",
    tipo: "video",
    url: "#",
    criado_por: "Líder da Liga",
  },
];

export function RecursosTab() {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
        Recursos da Liga
      </p>
      {RECURSOS_MOCK.map((r) => {
        const config = TIPO_CONFIG[r.tipo];
        return (
          <div
            key={r.id}
            className="bg-white border border-brand-gray rounded-lg px-4 py-3 flex items-center gap-3"
          >
            <div
              className={`w-9 h-9 rounded-lg ${config.bgClass} flex items-center justify-center text-lg flex-shrink-0`}
            >
              {config.icon}
            </div>
            <div className="flex-1">
              <div className="font-bold text-navy text-sm">{r.titulo}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Por {r.criado_por}</div>
            </div>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-link-blue hover:text-navy transition-colors"
            >
              ↗ Abrir
            </a>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/ligas/tabs/RecursosTab.tsx
git commit -m "feat(web): add RecursosTab with mock data"
```

---

## Task 11: Reescrever `HomePage`

**Files:**
- Modify: `apps/web/src/pages/home/HomePage.tsx`

- [ ] **Step 1: Reescrever o arquivo completo**

```typescript
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Liga } from "@link-leagues/types";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight } from "lucide-react";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

// Dados fictícios — substituir quando a feature de destaques for implementada
const DESTAQUES_MOCK = [
  { id: "1", icon: "↑", label: "SCORE", titulo: "Liga de Marketing", sub: "+12pts essa semana" },
  { id: "2", icon: "✅", label: "PROJETO", titulo: "Análise de Mercado", sub: "Concluído ontem" },
  { id: "3", icon: "🏆", label: "RANKING", titulo: "#1 Liga de Finanças", sub: "Lidera a temporada" },
];

export function HomePage() {
  const navigate = useNavigate();
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [minhaLiga, setMinhaLiga] = useState<Liga | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const { data: sessionData } = await supabase.auth.getSession();
      const meta = sessionData.session?.user.user_metadata;
      const email = sessionData.session?.user.email ?? "";
      setNomeUsuario(
        (meta?.full_name as string | undefined) ?? email.split("@")[0] ?? "Usuário"
      );

      const [ligasRes, minhaRes] = await Promise.all([
        fetch("/api/ligas", { headers }),
        fetch("/api/ligas/minha", { headers }),
      ]);

      if (ligasRes.ok) setLigas(await ligasRes.json());
      if (minhaRes.ok) setMinhaLiga(await minhaRes.json());
    }
    carregar();
  }, []);

  // Auto-avanço do carrossel a cada 1,5 segundos
  useEffect(() => {
    if (ligas.length === 0) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % ligas.length);
    }, 1500);
    return () => clearInterval(timerRef.current);
  }, [ligas.length]);

  function irPara(index: number) {
    clearInterval(timerRef.current);
    setCurrentIndex((index + ligas.length) % ligas.length);
    timerRef.current = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % ligas.length);
    }, 1500);
  }

  const ligaAtual = ligas[currentIndex];

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="font-display font-bold text-2xl text-navy">Olá, {nomeUsuario} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">Explore as ligas da plataforma</p>
      </div>

      {/* Zona 1 — Carrossel de ligas */}
      {ligas.length > 0 && ligaAtual && (
        <div className="rounded-xl overflow-hidden border border-brand-gray">
          {/* Slide */}
          <div
            className="relative h-48 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #10284E 0%, #546484 100%)" }}
            onClick={() => navigate(`/ligas/${ligaAtual.id}`)}
          >
            {ligaAtual.imagem_url && (
              <img
                src={ligaAtual.imagem_url}
                alt={ligaAtual.nome}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent" />

            {/* Seta esquerda */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                irPara(currentIndex - 1);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/35 rounded-full p-1.5 text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Seta direita */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                irPara(currentIndex + 1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/35 rounded-full p-1.5 text-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Conteúdo do card */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
              <div>
                <h2 className="font-display font-bold text-white text-lg leading-tight">
                  {ligaAtual.nome}
                </h2>
                <p className="text-white/70 text-xs mt-0.5">
                  Líder: {ligaAtual.lider_email ?? "—"}
                </p>
              </div>
              <div className="flex gap-2">
                <div className="bg-white/15 rounded-lg px-3 py-2 text-center">
                  <div className="text-brand-yellow font-bold text-sm">78</div>
                  <div className="text-white/70 text-xs">Score</div>
                </div>
                <div className="bg-white/15 rounded-lg px-3 py-2 text-center">
                  <div className="text-brand-yellow font-bold text-sm">
                    {ligaAtual.projetos_ativos ?? 0}
                  </div>
                  <div className="text-white/70 text-xs">Projetos</div>
                </div>
              </div>
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 py-2.5 bg-white">
            {ligas.map((_, i) => (
              <button
                key={i}
                onClick={() => irPara(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentIndex ? "w-4 bg-navy" : "w-1.5 bg-brand-gray"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Zona 2 — Minha Liga */}
      {minhaLiga && (
        <div>
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-2">
            Minha Liga
          </p>
          <div className="bg-white border border-brand-gray rounded-xl overflow-hidden">
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ background: "linear-gradient(90deg, #10284E, #546484)" }}
            >
              <div>
                <h3 className="font-bold text-white text-sm">{minhaLiga.nome}</h3>
                <p className="text-white/70 text-xs mt-0.5">
                  Líder: {minhaLiga.lider_email ?? "—"}
                </p>
              </div>
              <button
                onClick={() => navigate(`/ligas/${minhaLiga.id}`)}
                className="bg-brand-yellow text-navy text-xs font-bold px-3 py-1.5 rounded-md"
              >
                Ver detalhes →
              </button>
            </div>
            <div className="grid grid-cols-4 divide-x divide-brand-gray">
              <div className="px-3 py-3 text-center">
                <div className="font-bold text-amber-500 text-lg">78</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                  Score
                </div>
              </div>
              <div className="px-3 py-3 text-center">
                <div className="font-bold text-navy text-lg">
                  {minhaLiga.projetos_ativos ?? 0}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                  Projetos
                </div>
              </div>
              <div className="px-3 py-3 text-center">
                <div className="font-bold text-green-600 text-lg">—</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                  Presença
                </div>
              </div>
              <div className="px-3 py-3 text-center">
                <div className="font-bold text-navy text-lg">—</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                  Próx. Evento
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zona 3 — Destaques da semana (fictícios) */}
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-2">
          Destaques da Semana
        </p>
        <div className="grid grid-cols-3 gap-3">
          {DESTAQUES_MOCK.map((d) => (
            <div key={d.id} className="bg-white border border-brand-gray rounded-lg p-3">
              <div className="text-amber-500 text-xs font-bold mb-1">
                {d.icon} {d.label}
              </div>
              <div className="font-bold text-navy text-sm">{d.titulo}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{d.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/home/HomePage.tsx
git commit -m "feat(web): rewrite HomePage with liga carousel, minha liga card and highlights"
```

---

## Task 12: Typecheck + verificação final

**Files:** todos

- [ ] **Step 1: Rodar typecheck**

```bash
cd /caminho/para/Link-Hub && pnpm typecheck
```

Esperado: sem erros. Se houver erros de tipo, corrigi-los antes de continuar.

- [ ] **Step 2: Subir o servidor de desenvolvimento**

```bash
pnpm dev
```

Abrir `http://localhost:3000/home` e verificar:
- Carrossel full-width aparece
- Auto-avanço a cada 1,5 segundos
- Setas ‹ › funcionam e reiniciam o timer
- Dots indicam a liga atual
- Clicar no card navega para `/ligas/:id`
- Card "Minha Liga" aparece se o usuário pertence a uma liga
- Botão "Ver detalhes →" navega para `/ligas/:id` correto

- [ ] **Step 3: Verificar página de detalhe da liga**

Navegar para `/ligas/:id` (qualquer liga):
- Hero com nome, líder, badge "Minha Liga" se aplicável
- 6 abas clicáveis
- Aba **Visão Geral**: 4 métricas + próximo evento (se houver)
- Aba **Líder**: perfil do líder + diretores
- Aba **Membros**: tabela com membros, cargo e data de ingresso
- Aba **Presença**: tabela com status coloridos (verde/vermelho/amarelo)
- Aba **Projetos**: lista com status e % de conclusão
- Aba **Recursos**: 3 itens mock com ícones

- [ ] **Step 4: Commit final**

```bash
git add .
git commit -m "chore: typecheck pass — home + liga detail pages complete"
```

---

## Notas de Implementação

- **Score e faturamento/membro**: valores hardcoded `78` e `R$420` respectivamente. Marcados com comentário `// Valor fictício` para facilitar busca futura.
- **Tabela `recursos`**: não existe ainda no banco. `RecursosTab` usa dados mock. Para integrar, criar a tabela no Supabase e substituir `RECURSOS_MOCK` por chamada a `GET /api/ligas/:id/recursos`.
- **Presença no card "Minha Liga"**: exibe `—` por ora (requer endpoint separado para % de presença do usuário logado). Integrar com `VisaoGeralTab` em iteração futura.
- **`GET /ligas/minha` deve ficar ANTES de `GET /ligas/:id`** no arquivo da API para não ser capturado pelo parâmetro dinâmico.
