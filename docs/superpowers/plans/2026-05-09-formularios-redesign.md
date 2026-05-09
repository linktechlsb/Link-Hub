# Formulários Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar as três páginas de Formulários para seguir o padrão visual de Ligas/Projetos — `SectionHeader`, `KpiRow`, tipografia `font-plex-mono`, filtros em pills, tabela com hover state — e corrigir URLs hardcoded para `localhost:3001`.

**Architecture:** Cada um dos três arquivos de página é modificado de forma independente. Nenhum novo componente é criado. `SectionHeader` e `KpiRow` são importados de `@/pages/home/v1/primitives`; `useCachedFetch` substitui o fetch manual na lista. A lógica funcional (fetch, ações, Sheet de candidato) é preservada — só o JSX muda.

**Tech Stack:** React 18, TypeScript strict, Tailwind CSS v3, shadcn/ui, lucide-react, sonner (toast)

---

## File Map

| Arquivo                                                    | Mudança                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `apps/web/src/pages/formularios/FormulariosPage.tsx`       | Redesign completo — novo header, KpiRow, SectionHeader, tabela, filtros, URL relativa                  |
| `apps/web/src/pages/formularios/FormularioDetalhePage.tsx` | Redesign completo — novo header, barra distribuição CSS, KpiRow, SectionHeader, tabela, URLs relativas |
| `apps/web/src/pages/formularios/NovoFormularioPage.tsx`    | Visual update — eyebrow no header + URLs relativas                                                     |

**Referência (ler, não alterar):**

- `apps/web/src/pages/home/v1/primitives.tsx` — exporta `SectionHeader`, `KpiRow`, `KpiItem`
- `apps/web/src/hooks/use-cached-fetch.ts` — hook para fetch com cache

---

## Task 1: FormulariosPage — Redesign Completo

**Files:**

- Modify: `apps/web/src/pages/formularios/FormulariosPage.tsx`

### Contexto do componente atual

A página atual usa cards estilizados individualmente, sem KpiRow ou SectionHeader. Busca via `fetch("http://localhost:3001/api/formularios", ...)`. O tipo `FormularioComLiga extends Formulario` com `liga_nome: string` deve ser preservado.

- [ ] **Step 1: Substituir o arquivo completo pelo redesign**

Substitua todo o conteúdo de `apps/web/src/pages/formularios/FormulariosPage.tsx` por:

```tsx
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { KpiRow, SectionHeader } from "@/pages/home/v1/primitives";

import type { Formulario, FormularioStatus } from "@link-leagues/types";
import type { KpiItem } from "@/pages/home/v1/primitives";

const STATUS_LABELS: Record<FormularioStatus, string> = {
  rascunho: "Rascunho",
  aberto: "Aberto",
  encerrado: "Encerrado",
};

const STATUS_BADGE: Record<FormularioStatus, string> = {
  rascunho: "bg-brand-yellow/20 text-navy",
  aberto: "bg-green-100 text-green-800",
  encerrado: "bg-navy/10 text-navy/60",
};

type Filtro = FormularioStatus | "todos";

interface FormularioComLiga extends Formulario {
  liga_nome: string;
}

export function FormulariosPage() {
  const navigate = useNavigate();
  const { data } = useCachedFetch<FormularioComLiga[]>("/api/formularios");
  const formularios = data ?? [];
  const carregando = data === null;
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const filtrados = useMemo(
    () => (filtro === "todos" ? formularios : formularios.filter((f) => f.status === filtro)),
    [formularios, filtro],
  );

  const kpis: KpiItem[] = [
    { label: "Total", valor: String(formularios.length) },
    {
      label: "Abertos",
      valor: String(formularios.filter((f) => f.status === "aberto").length),
    },
    {
      label: "Encerrados",
      valor: String(formularios.filter((f) => f.status === "encerrado").length),
    },
    {
      label: "Rascunhos",
      valor: String(formularios.filter((f) => f.status === "rascunho").length),
    },
  ];

  const filtros: { valor: Filtro; label: string }[] = [
    { valor: "todos", label: "Todos" },
    { valor: "aberto", label: "Abertos" },
    { valor: "encerrado", label: "Encerrados" },
    { valor: "rascunho", label: "Rascunhos" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/40 mb-1">
            Processos Seletivos
          </p>
          <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
            Formulários
          </h1>
        </div>
        <Button
          onClick={() => navigate("/formularios/novo")}
          className="bg-navy text-white hover:bg-navy/90 gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Formulário
        </Button>
      </div>

      {/* KPIs */}
      <div className="mb-10">
        <KpiRow items={kpis} cols={4} />
      </div>

      {/* Section header */}
      <div className="space-y-12">
        <section>
          <SectionHeader
            titulo="Todos os Formulários"
            tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
          />

          {/* Filtros */}
          <div className="flex gap-2 mb-5">
            {filtros.map(({ valor, label }) => (
              <button
                key={valor}
                onClick={() => setFiltro(valor)}
                className={
                  filtro === valor
                    ? "bg-navy text-white px-3 py-1 rounded-full text-[11px] font-semibold transition-colors"
                    : "border border-navy/20 text-navy/60 px-3 py-1 rounded-full text-[11px] font-semibold hover:border-navy/40 transition-colors"
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tabela */}
          {carregando ? (
            <p className="text-[13px] text-navy/40 py-10 text-center">Carregando...</p>
          ) : filtrados.length === 0 ? (
            <div className="border border-dashed border-navy/20 rounded-lg py-16 text-center">
              <p className="text-[13px] text-navy/40">
                {formularios.length === 0
                  ? "Nenhum formulário ainda."
                  : "Nenhum formulário neste filtro."}
              </p>
              {formularios.length === 0 && (
                <Button
                  onClick={() => navigate("/formularios/novo")}
                  className="mt-4 bg-navy text-white hover:bg-navy/90"
                >
                  Criar primeiro formulário
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-foreground/[0.08]">
                  {["Título", "Liga", "Pontuação mínima", "Status", "Criado em"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/40 font-normal"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => navigate(`/formularios/${f.id}`)}
                    className="border-b border-foreground/[0.06] hover:bg-navy/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-plex-sans text-[13px] font-semibold text-navy">
                      {f.nome}
                    </td>
                    <td className="py-3 px-4 font-plex-sans text-[13px] text-navy/60">
                      {f.liga_nome}
                    </td>
                    <td className="py-3 px-4 font-plex-sans text-[13px] text-navy/60">
                      {f.pontuacao_minima_aprovacao}/100
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[f.status]}`}
                      >
                        {STATUS_LABELS[f.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-plex-mono text-[11px] text-navy/40">
                      {new Date(f.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub && npm run typecheck 2>&1 | head -40
```

Esperado: sem erros em `FormulariosPage.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/formularios/FormulariosPage.tsx
git commit -m "redesign: FormulariosPage com KpiRow, tabela e filtros por status"
```

---

## Task 2: FormularioDetalhePage — Redesign Completo

**Files:**

- Modify: `apps/web/src/pages/formularios/FormularioDetalhePage.tsx`

### Contexto do componente atual

A página de detalhe carrega `FormularioComPerguntas` e `ResultadosFormulario` em paralelo. Exibe candidatos com filtro por status e Sheet para ver respostas individuais. Precisa: atualizar header, adicionar barra de distribuição CSS, trocar os stats por `KpiRow`, adicionar `SectionHeader` antes da tabela, corrigir todas as URLs para relativas.

- [ ] **Step 4: Substituir o arquivo completo pelo redesign**

Substitua todo o conteúdo de `apps/web/src/pages/formularios/FormularioDetalhePage.tsx` por:

```tsx
import { ArrowLeft, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KpiRow, SectionHeader } from "@/pages/home/v1/primitives";
import { supabase } from "@/lib/supabase";

import type {
  FormularioCandidato,
  FormularioComPerguntas,
  ResultadosFormulario,
  CandidatoStatus,
  FormularioStatus,
} from "@link-leagues/types";
import type { KpiItem } from "@/pages/home/v1/primitives";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_CANDIDATO_LABELS: Record<CandidatoStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

const STATUS_CANDIDATO_BADGE: Record<CandidatoStatus, string> = {
  pendente: "bg-amber-100 text-amber-700",
  aprovado: "bg-green-100 text-green-700",
  reprovado: "bg-red-100 text-red-600",
};

const STATUS_FORMULARIO_LABELS: Record<FormularioStatus, string> = {
  rascunho: "Rascunho",
  aberto: "Aberto",
  encerrado: "Encerrado",
};

const STATUS_FORMULARIO_BADGE: Record<FormularioStatus, string> = {
  rascunho: "bg-brand-yellow/20 text-navy",
  aberto: "bg-green-100 text-green-800",
  encerrado: "bg-navy/10 text-navy/60",
};

type FiltroStatus = CandidatoStatus | "todos";

export function FormularioDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [formulario, setFormulario] = useState<FormularioComPerguntas | null>(null);
  const [resultados, setResultados] = useState<ResultadosFormulario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [candidatoAberto, setCandidatoAberto] = useState<FormularioCandidato | null>(null);

  useEffect(() => {
    if (id) carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function carregarDados() {
    try {
      setCarregando(true);
      const token = await getToken();
      const [resFormulario, resResultados] = await Promise.all([
        fetch(`/api/formularios/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/formularios/${id}/resultados`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (!resFormulario.ok) throw new Error("Formulário não encontrado");
      setFormulario(await resFormulario.json());
      if (resResultados.ok) setResultados(await resResultados.json());
    } catch {
      toast.error("Erro ao carregar formulário");
    } finally {
      setCarregando(false);
    }
  }

  async function sincronizar() {
    if (!id) return;
    try {
      setSincronizando(true);
      const token = await getToken();
      const res = await fetch(`/api/formularios/${id}/sincronizar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const dados = await res.json();
      toast.success(
        `${(dados as { sincronizados: number }).sincronizados} novo(s) candidato(s) sincronizado(s).`,
      );
      await carregarDados();
    } catch {
      toast.error("Erro ao sincronizar respostas");
    } finally {
      setSincronizando(false);
    }
  }

  async function encerrar() {
    if (!id) return;
    try {
      setEncerrando(true);
      const token = await getToken();
      const res = await fetch(`/api/formularios/${id}/encerrar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success("Formulário encerrado.");
      await carregarDados();
    } catch {
      toast.error("Erro ao encerrar formulário");
    } finally {
      setEncerrando(false);
    }
  }

  function exportarCSV() {
    if (!resultados) return;
    const linhas = [
      ["Nome", "Email", "Pontuação", "Status", "Data de submissão", "Motivo reprovação"],
      ...resultados.candidatos.map((c) => [
        c.nome,
        c.email,
        String(c.pontuacao_total),
        STATUS_CANDIDATO_LABELS[c.status],
        new Date(c.submitted_at).toLocaleString("pt-BR"),
        c.motivo_reprovacao ?? "",
      ]),
    ];
    const csv = linhas.map((l) => l.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidatos-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const candidatosFiltrados =
    resultados?.candidatos.filter((c) => filtroStatus === "todos" || c.status === filtroStatus) ??
    [];

  const formularioComLiga = formulario as (FormularioComPerguntas & { liga_nome?: string }) | null;

  // Barra de distribuição CSS
  const total = resultados?.total ?? 0;
  const pctAprovados = total > 0 ? Math.round((resultados!.aprovados / total) * 100) : 0;
  const pctReprovados = total > 0 ? Math.round((resultados!.reprovados / total) * 100) : 0;
  const pctPendentes = total > 0 ? 100 - pctAprovados - pctReprovados : 0;

  const kpis: KpiItem[] = [
    { label: "Total", valor: String(resultados?.total ?? 0) },
    { label: "Aprovados", valor: String(resultados?.aprovados ?? 0) },
    { label: "Reprovados", valor: String(resultados?.reprovados ?? 0) },
    { label: "Pendentes", valor: String(resultados?.pendentes ?? 0) },
  ];

  if (carregando) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10 text-center text-navy/40 text-[13px]">
        Carregando...
      </div>
    );
  }

  if (!formulario) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10 text-center text-navy/40 text-[13px]">
        Formulário não encontrado.
      </div>
    );
  }

  const filtrosStatus: { valor: FiltroStatus; label: string }[] = [
    { valor: "todos", label: "Todos" },
    { valor: "aprovado", label: "Aprovados" },
    { valor: "pendente", label: "Pendentes" },
    { valor: "reprovado", label: "Reprovados" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Back link */}
      <button
        onClick={() => navigate("/formularios")}
        className="flex items-center gap-1 text-[12px] text-navy/50 hover:text-navy mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Formulários
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
              {formulario.nome}
            </h1>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_FORMULARIO_BADGE[formulario.status]}`}
            >
              {STATUS_FORMULARIO_LABELS[formulario.status]}
            </span>
          </div>
          {formularioComLiga?.liga_nome && (
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/40">
              {formularioComLiga.liga_nome}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {formulario.google_form_url && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-navy/20 text-navy gap-1.5"
                onClick={() => {
                  navigator.clipboard.writeText(formulario.google_form_url ?? "");
                  toast.success("Link copiado!");
                }}
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar link
              </Button>
              <a href={formulario.google_form_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="border-navy/20 text-navy gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir form
                </Button>
              </a>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={sincronizar}
            disabled={sincronizando}
            className="border-navy/20 text-navy gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? "animate-spin" : ""}`} />
            {sincronizando ? "Sincronizando..." : "Sincronizar"}
          </Button>
          {formulario.status === "aberto" && (
            <Button
              variant="outline"
              size="sm"
              onClick={encerrar}
              disabled={encerrando}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              {encerrando ? "Encerrando..." : "Encerrar"}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-12">
        {/* Seção 01 — Visão Geral */}
        <section>
          <SectionHeader
            titulo="Visão Geral da Seleção"
            tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
          />

          {resultados && resultados.total > 0 && (
            <div className="mb-6">
              <div className="flex h-2 rounded-full overflow-hidden bg-navy/10 mb-3">
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${pctAprovados}%` }}
                />
                <div className="bg-red-400 transition-all" style={{ width: `${pctReprovados}%` }} />
                <div
                  className="bg-amber-400 transition-all"
                  style={{ width: `${pctPendentes}%` }}
                />
              </div>
              <div className="flex gap-6 text-[11px] text-navy/60">
                <span>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 align-middle" />
                  Aprovados ({resultados.aprovados})
                </span>
                <span>
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1.5 align-middle" />
                  Reprovados ({resultados.reprovados})
                </span>
                <span>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5 align-middle" />
                  Pendentes ({resultados.pendentes})
                </span>
              </div>
            </div>
          )}

          <KpiRow items={kpis} cols={4} />
        </section>

        {/* Seção 02 — Candidatos */}
        <section>
          <SectionHeader
            titulo="Lista de Candidatos"
            tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
            acao={
              resultados && resultados.total > 0 ? (
                <button
                  onClick={exportarCSV}
                  className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-foreground hover:text-background transition-colors"
                >
                  Exportar CSV
                </button>
              ) : null
            }
          />

          {/* Filtros */}
          <div className="flex gap-2 mb-5">
            {filtrosStatus.map(({ valor, label }) => (
              <button
                key={valor}
                onClick={() => setFiltroStatus(valor)}
                className={
                  filtroStatus === valor
                    ? "bg-navy text-white px-3 py-1 rounded-full text-[11px] font-semibold transition-colors"
                    : "border border-navy/20 text-navy/60 px-3 py-1 rounded-full text-[11px] font-semibold hover:border-navy/40 transition-colors"
                }
              >
                {label}
              </button>
            ))}
          </div>

          {candidatosFiltrados.length === 0 ? (
            <div className="border border-dashed border-navy/20 rounded-lg py-16 text-center">
              <p className="text-[13px] text-navy/40">
                {resultados?.total === 0
                  ? "Nenhum candidato ainda. Clique em Sincronizar para buscar respostas."
                  : "Nenhum candidato neste filtro."}
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-foreground/[0.08]">
                  {["Nome", "Email", "Pontuação", "Status", "Data"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/40 font-normal"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {candidatosFiltrados.map((candidato) => (
                  <tr
                    key={candidato.id}
                    onClick={() => setCandidatoAberto(candidato)}
                    className="border-b border-foreground/[0.06] hover:bg-navy/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-plex-sans text-[13px] font-semibold text-navy">
                      {candidato.nome}
                    </td>
                    <td className="py-3 px-4 font-plex-sans text-[13px] text-navy/60">
                      {candidato.email}
                    </td>
                    <td className="py-3 px-4 font-plex-sans text-[13px] font-semibold text-navy">
                      {candidato.pontuacao_total}/100
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CANDIDATO_BADGE[candidato.status]}`}
                      >
                        {STATUS_CANDIDATO_LABELS[candidato.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-plex-mono text-[11px] text-navy/40">
                      {new Date(candidato.submitted_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* Sheet — candidato individual */}
      <Sheet open={!!candidatoAberto} onOpenChange={(open) => !open && setCandidatoAberto(null)}>
        <SheetContent className="w-[400px] sm:w-[500px]">
          <SheetHeader>
            <SheetTitle className="font-display font-bold text-[16px] text-navy">
              {candidatoAberto?.nome}
            </SheetTitle>
          </SheetHeader>
          {candidatoAberto && (
            <div className="mt-4 space-y-4 overflow-y-auto">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_CANDIDATO_BADGE[candidatoAberto.status]}`}
                >
                  {STATUS_CANDIDATO_LABELS[candidatoAberto.status]}
                </span>
                <span className="font-plex-sans text-[13px] text-navy font-semibold">
                  {candidatoAberto.pontuacao_total}/100
                </span>
              </div>
              <p className="font-plex-sans text-[12px] text-navy/50">{candidatoAberto.email}</p>
              {candidatoAberto.motivo_reprovacao && (
                <div className="bg-red-50 border border-red-100 p-3 text-[12px] text-red-600 rounded">
                  {candidatoAberto.motivo_reprovacao}
                </div>
              )}
              <div className="space-y-3 mt-4">
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/40">
                  Respostas
                </p>
                {formulario.perguntas.map((pergunta, i) => {
                  type GoogleAnswer = {
                    textAnswers?: { answers: Array<{ value: string }> };
                    scaleAnswer?: { value: number };
                  };
                  const answers = candidatoAberto.respostas as unknown as Record<
                    string,
                    GoogleAnswer
                  >;
                  const answer = pergunta.google_item_id
                    ? answers?.[pergunta.google_item_id]
                    : undefined;
                  const valor =
                    answer?.scaleAnswer?.value?.toString() ??
                    answer?.textAnswers?.answers?.[0]?.value ??
                    "—";

                  return (
                    <div key={i} className="border-b border-navy/[0.08] pb-3">
                      <p className="font-plex-mono text-[10px] uppercase tracking-[0.1em] text-navy/40 mb-0.5">
                        {pergunta.titulo}
                      </p>
                      <p className="font-plex-sans text-[13px] text-navy">{valor}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 5: Verificar typecheck**

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub && npm run typecheck 2>&1 | head -40
```

Esperado: sem erros em `FormularioDetalhePage.tsx`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/formularios/FormularioDetalhePage.tsx
git commit -m "redesign: FormularioDetalhePage com KpiRow, barra de distribuição e SectionHeader"
```

---

## Task 3: NovoFormularioPage — Atualização Visual + URLs Relativas

**Files:**

- Modify: `apps/web/src/pages/formularios/NovoFormularioPage.tsx`

### Contexto

A página de criação tem fluxo em 4 etapas + tela de sucesso (etapa 5). Não alteramos a lógica. As mudanças são:

1. Adicionar eyebrow "Novo Processo Seletivo" acima do `<h1>`
2. Corrigir as 3 URLs hardcoded para relativas

- [ ] **Step 7: Adicionar eyebrow ao header**

No arquivo `apps/web/src/pages/formularios/NovoFormularioPage.tsx`, localize o bloco do header principal (linha ~443):

```tsx
<div className="mb-8">
  <button
    onClick={() => navigate("/formularios")}
    className="flex items-center gap-1 text-[12px] text-navy/50 hover:text-navy mb-4 transition-colors"
  >
    <ArrowLeft className="w-3.5 h-3.5" />
    Voltar
  </button>
  <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
    Novo Formulário
  </h1>
</div>
```

Substitua por:

```tsx
<div className="mb-8">
  <button
    onClick={() => navigate("/formularios")}
    className="flex items-center gap-1 text-[12px] text-navy/50 hover:text-navy mb-6 transition-colors"
  >
    <ArrowLeft className="w-3.5 h-3.5" />
    Formulários
  </button>
  <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/40 mb-1">
    Novo Processo Seletivo
  </p>
  <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
    Criar Formulário
  </h1>
</div>
```

- [ ] **Step 8: Corrigir URLs hardcoded (3 ocorrências)**

Substitua cada URL com `http://localhost:3001` pela URL relativa correspondente:

Linha ~229:

```tsx
      const res = await fetch("http://localhost:3001/api/formularios/minha-liga", {
```

→

```tsx
      const res = await fetch("/api/formularios/minha-liga", {
```

Linha ~246:

```tsx
      const res = await fetch("http://localhost:3001/api/ligas", {
```

→

```tsx
      const res = await fetch("/api/ligas", {
```

Linha ~362:

```tsx
      const res = await fetch("http://localhost:3001/api/formularios", {
```

→

```tsx
      const res = await fetch("/api/formularios", {
```

Linha ~380:

```tsx
        await fetch(`http://localhost:3001/api/formularios/${formulario.id}/publicar`, {
```

→

```tsx
        await fetch(`/api/formularios/${formulario.id}/publicar`, {
```

- [ ] **Step 9: Verificar typecheck**

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub && npm run typecheck 2>&1 | head -40
```

Esperado: zero erros de tipos.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/pages/formularios/NovoFormularioPage.tsx
git commit -m "fix: NovoFormularioPage eyebrow header e URLs relativas"
```

---

## Verificação Final

- [ ] **Step 11: Abrir o app e testar o fluxo completo**

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub && npm run dev
```

Checklist manual (abrir `http://localhost:3000`):

1. Navegar para `/formularios`

   - Header "Formulários" com eyebrow "PROCESSOS SELETIVOS"
   - KpiRow com 4 cards (Total, Abertos, Encerrados, Rascunhos)
   - Tabela com colunas: Título | Liga | Pontuação mínima | Status | Criado em
   - Pills de filtro funcionando (Todos / Abertos / Encerrados / Rascunhos)
   - Hover na linha muda o fundo
   - Empty state com botão "Criar primeiro formulário"

2. Clicar em um formulário → navega para `/formularios/:id`

   - Back link "← Formulários"
   - Header com nome, badge de status, botões de ação
   - Barra de distribuição colorida (verde/vermelho/âmbar) quando há candidatos
   - KpiRow com 4 cards de candidatos
   - Filtros por status funcionando
   - Tabela de candidatos com hover
   - Clicar em candidato abre Sheet lateral com respostas
   - Botão Exportar CSV aparece quando há candidatos

3. Navegar para `/formularios/novo`
   - Eyebrow "NOVO PROCESSO SELETIVO" acima do título "Criar Formulário"
   - Back link "← Formulários"
   - Fluxo em etapas funciona normalmente
