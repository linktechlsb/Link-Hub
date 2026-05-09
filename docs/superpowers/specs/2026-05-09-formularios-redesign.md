# Redesign — Página de Formulários

**Data:** 2026-05-09
**Status:** Aprovado para implementação

---

## Contexto

A página de Formulários (`/formularios`) e sua página de detalhe (`/formularios/:id`) foram construídas num estilo visual diferente das páginas mais recentes da plataforma (Ligas, Projetos, Mural, Agenda). O objetivo é aplicar o mesmo padrão de design — `SectionHeader`, `KpiRow`, tipografia `font-display`/`font-plex-mono`, filtros em pills, tabelas com hover state — e corrigir bugs menores (URL hardcoded `localhost:3001`).

A página de criação (`/formularios/novo`) receberá apenas atualização visual.

---

## Decisões de Design

| Decisão              | Escolha                                             |
| -------------------- | --------------------------------------------------- |
| Layout da lista      | Tabela com KPIs + filtros (padrão Ligas)            |
| Acesso ao detalhe    | Clicar na linha navega para página separada         |
| Estrutura do detalhe | Seções empilhadas com `SectionHeader` (sem tabs)    |
| Novo formulário      | Manter fluxo atual (`/formularios/novo`), só visual |
| Gráficos             | Barra de distribuição CSS (sem biblioteca externa)  |

---

## Arquivos a Modificar

| Arquivo                                                    | Mudança            |
| ---------------------------------------------------------- | ------------------ |
| `apps/web/src/pages/formularios/FormulariosPage.tsx`       | Redesign completo  |
| `apps/web/src/pages/formularios/FormularioDetalhePage.tsx` | Redesign completo  |
| `apps/web/src/pages/formularios/NovoFormularioPage.tsx`    | Atualização visual |

**Componentes reutilizados (não criar novos):**

- `SectionHeader` — `apps/web/src/pages/home/v1/primitives.tsx`
- `KpiRow` — `apps/web/src/pages/home/v1/primitives.tsx`
- `Button`, `Badge`, `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` — shadcn/ui em `apps/web/src/components/ui/`

---

## 1. FormulariosPage.tsx — Redesign Completo

### Layout geral

```
max-w-5xl mx-auto px-8 py-10
```

### Header

```tsx
<div className="flex items-start justify-between mb-8">
  <div>
    <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/40 mb-1">
      Processos Seletivos
    </p>
    <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">Formulários</h1>
  </div>
  <Button onClick={() => navigate("/formularios/novo")} className="bg-navy text-white gap-1.5">
    <Plus className="w-4 h-4" /> Novo Formulário
  </Button>
</div>
```

### KpiRow

Quatro métricas calculadas da lista de formulários:

- **Total** — `formularios.length`
- **Abertos** — `status === 'aberto'`
- **Encerrados** — `status === 'encerrado'`
- **Rascunhos** — `status === 'rascunho'`

Usar o componente `KpiRow` com `centered={false}`.

### SectionHeader + Filtros

```tsx
<SectionHeader numero="01" eyebrow="Lista" titulo="Todos os Formulários" />;

{
  /* Pills de filtro */
}
<div className="flex gap-2 mb-4">
  {["todos", "aberto", "encerrado", "rascunho"].map((s) => (
    <button
      key={s}
      onClick={() => setFiltro(s)}
      className={
        filtro === s
          ? "bg-navy text-white px-3 py-1 rounded-full text-[11px] font-semibold"
          : "border border-navy/20 text-navy/60 px-3 py-1 rounded-full text-[11px] hover:border-navy/40"
      }
    >
      {label}
    </button>
  ))}
</div>;
```

### Tabela

Colunas: **Título** | **Liga** | **Pontuação mínima** | **Status** | **Criado em**

Campos disponíveis no tipo `Formulario`: `nome`, `liga_id`, `pontuacao_minima_aprovacao`, `status`, `created_at`. A API deve retornar `liga_nome` junto (como já faz hoje na página de detalhe via `formularioComLiga.liga_nome`).

- Cabeçalho: `text-[11px] uppercase tracking-[0.1em] text-navy/40 font-semibold`
- Linha: `hover:bg-navy/[0.02] cursor-pointer transition-colors border-b border-navy/[0.06]`
- Clicar na linha: `navigate(\`/formularios/${f.id}\`)`
- Badge de status: verde (aberto), cinza (encerrado), amarelo (rascunho)
- "Criado em": `new Date(f.created_at).toLocaleDateString("pt-BR")`

### Fetch

Corrigir para URL relativa: `fetch("/api/formularios", ...)` (remover `http://localhost:3001`)

---

## 2. FormularioDetalhePage.tsx — Redesign Completo

### Header

```
← Formulários  (link de voltar, text-[12px] text-navy/50)

Título do Formulário                [Copiar link] [Abrir Form] [Sincronizar] [Encerrar]
Liga · badge de status
```

- Badge de status: padrão existente (cores por status)
- Botões de ação: manter lógica atual, só aplicar classes `border-navy/20 text-navy`
- Botão Encerrar: `border-red-200 text-red-600 hover:bg-red-50` (já está correto)

### Seção 01 — Visão Geral

```tsx
<SectionHeader numero="01" eyebrow="Resultado" titulo="Visão Geral da Seleção" />
```

**Barra de distribuição visual** (novo componente inline, CSS puro):

```tsx
{
  /* Barra horizontal dividida em 3 segmentos coloridos */
}
<div className="flex h-2 rounded-full overflow-hidden bg-navy/10 mb-4">
  <div className="bg-green-500" style={{ width: `${pctAprovados}%` }} />
  <div className="bg-red-400" style={{ width: `${pctReprovados}%` }} />
  <div className="bg-amber-400" style={{ width: `${pctPendentes}%` }} />
</div>;
{
  /* Legenda */
}
<div className="flex gap-6 text-[11px]">
  <span>
    <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />
    Aprovados ({resultados.aprovados})
  </span>
  <span>
    <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />
    Reprovados ({resultados.reprovados})
  </span>
  <span>
    <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />
    Pendentes ({resultados.pendentes})
  </span>
</div>;
```

**KpiRow** com 4 itens (todos de `ResultadosFormulario`):

- Total candidatos, Aprovados, Reprovados, Pendentes

### Seção 02 — Candidatos

```tsx
<SectionHeader
  numero="02"
  eyebrow="Candidatos"
  titulo="Lista de Candidatos"
  acao={
    <Button variant="outline" size="sm" onClick={exportarCSV}>
      Exportar CSV
    </Button>
  }
/>
```

**Filtros por status** (mesmos pills da lista principal):
`Todos | Aprovado | Pendente | Reprovado`

**Tabela de candidatos** (manter estrutura atual):

- Colunas: Nome | Email | Pontuação | Status | Data
- Click na linha → Sheet lateral com respostas individuais (manter lógica e Sheet atual)

### Sheet de candidato individual

Manter estrutura atual — só atualizar classes tipográficas para alinhar com padrão (`font-display`, `font-plex-mono` para labels).

### Fetch

Corrigir URLs:

```ts
fetch(`/api/formularios/${id}`, ...)
fetch(`/api/formularios/${id}/resultados`, ...)
fetch(`/api/formularios/${id}/sincronizar`, ...)
fetch(`/api/formularios/${id}/encerrar`, ...)
```

---

## 3. NovoFormularioPage.tsx — Atualização Visual

Aplicar padrão de header:

```tsx
<div className="max-w-5xl mx-auto px-8 py-10">
  <button
    onClick={() => navigate(-1)}
    className="flex items-center gap-1 text-[12px] text-navy/50 hover:text-navy mb-6"
  >
    <ArrowLeft className="w-3.5 h-3.5" /> Voltar
  </button>
  <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/40 mb-1">
    Novo Processo Seletivo
  </p>
  <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mb-8">
    Criar Formulário
  </h1>
  {/* form fields — manter estrutura atual */}
</div>
```

Atualizar campos do formulário para usar `border-navy/20`, labels em `font-plex-mono text-[10px] uppercase tracking-[0.14em]`.

---

## Estados de Loading e Vazio

**Loading state** (manter padrão das outras páginas):

```tsx
<div className="text-[13px] text-navy/40 py-10 text-center">Carregando...</div>
```

**Empty state** (formulários zerados):

```tsx
<div className="border border-dashed border-navy/20 rounded-lg py-16 text-center">
  <p className="text-[13px] text-navy/40">Nenhum formulário ainda.</p>
  <Button onClick={() => navigate("/formularios/novo")} className="mt-4 bg-navy text-white">
    Criar primeiro formulário
  </Button>
</div>
```

---

## Verificação

1. Abrir `/formularios` — confirmar KPIs corretos, filtros funcionando, tabela com hover e navegação
2. Clicar em um formulário — confirmar navegação para `/formularios/:id`
3. Na página de detalhe — verificar barra de distribuição, KpiRow, table de candidatos
4. Clicar em um candidato — confirmar Sheet abre com respostas
5. Testar Sincronizar, Encerrar, Copiar link, Exportar CSV
6. Abrir `/formularios/novo` — confirmar visual atualizado
7. `npm run typecheck` — sem erros de tipos
