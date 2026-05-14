# Dark Neutral Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Dark Neutral design system across toda a plataforma Link Leagues, eliminando backgrounds hardcoded, adaptando cores para dark mode e unificando tokens de UI.

**Architecture:** Purely a styling pass — sem mudanças em lógica, rotas ou dados. Cada task mexe em um arquivo ou grupo pequeno de arquivos, verificada com `npm run typecheck` e inspecção visual. Os overrides globais `.dark .text-navy` em `index.css` já cobrem a maioria dos textos — este plano trata os casos restantes não cobertos por eles (backgrounds hardcoded, bg-slate-_, bg-amber-_).

**Tech Stack:** React 18, Tailwind CSS v3, shadcn/ui, CSS custom properties (HSL)

---

## Arquivos modificados

| Arquivo                                                       | O que muda                                                                                         |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/web/src/index.css`                                      | `--sidebar-accent` → `#141414`                                                                     |
| `apps/web/src/layouts/AppLayout.tsx`                          | Topbar: altura `h-10`, borda `border-[#191919]`                                                    |
| `apps/web/src/pages/home/v1/EditorialHero.tsx`                | `bg-[#f5f5f3]` → `bg-background`; remover todos `text-navy`, `border-navy` hardcoded               |
| `apps/web/src/pages/home/KpiCard.tsx`                         | `bg-slate-50` → `bg-background`; `text-navy` → `text-foreground`                                   |
| `apps/web/src/pages/home/HomeStaffView.tsx`                   | `bg-slate-50` e `bg-red-50` em TableRows → remover; `text-slate-700` → `text-foreground`           |
| `apps/web/src/pages/home/HomeProfessorView.tsx`               | `bg-slate-50` em TableRow e rodapé → `bg-background`; `text-slate-*` → `text-foreground`           |
| `apps/web/src/pages/home/v1/HomeStaffViewV1.tsx`              | Botão "Ver todos →" remove `text-navy border-b border-navy` → `text-muted-foreground`              |
| `apps/web/src/pages/gerenciamento/GerenciamentoStaffPage.tsx` | `bg-white` em inputs e dropdown → `bg-background`; `border-navy/15` já coberto por override global |
| `apps/web/src/pages/home/RankingLigas.tsx`                    | `text-slate-700` → `text-foreground`; `bg-slate-300` → `bg-foreground/20`                          |

---

## Task 1: Afinar token sidebar-accent no CSS

**Arquivo:** `apps/web/src/index.css`

- [ ] Em `.dark`, alterar `--sidebar-accent` de `0 0% 10%` para `0 0% 7.8%` (≈ `#141414`):

```css
--sidebar-accent: 0 0% 7.8%; /* #141414 — nav ativo bg */
```

- [ ] Rodar typecheck para confirmar sem erros:

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub && npm run typecheck
```

Esperado: sem erros de tipo.

- [ ] Commit:

```bash
git add apps/web/src/index.css
git commit -m "design: refine sidebar-accent token to #141414"
```

---

## Task 2: AppLayout — topbar altura e borda

**Arquivo:** `apps/web/src/layouts/AppLayout.tsx`

- [ ] Substituir o `<header>` atual:

```tsx
<header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
```

Por:

```tsx
<header className="flex h-10 shrink-0 items-center gap-2 border-b border-[#191919] bg-background px-4">
```

- [ ] Rodar typecheck:

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub && npm run typecheck
```

- [ ] Commit:

```bash
git add apps/web/src/layouts/AppLayout.tsx
git commit -m "design: topbar height 40px and border #191919"
```

---

## Task 3: EditorialHero — remover bg hardcoded e navy

**Arquivo:** `apps/web/src/pages/home/v1/EditorialHero.tsx`

- [ ] Substituir o bloco `<div role="button" ...>` (linha 71) — trocar `bg-[#f5f5f3]` e classes de navy:

```tsx
// DE:
className =
  "block w-full text-left bg-[#f5f5f3] p-7 rounded-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2";

// PARA:
className =
  "block w-full text-left bg-background border border-[#191919] rounded-lg p-7 cursor-pointer focus:outline-none focus:ring-1 focus:ring-foreground/20";
```

- [ ] Substituir o contador de liga (linha 74):

```tsx
// DE:
<span className="font-plex-mono text-[11px] tracking-[0.14em] text-navy">
  {current} <span className="text-navy/40">/ {total}</span>
</span>

// PARA:
<span className="font-plex-mono text-[11px] tracking-[0.14em] text-foreground">
  {current} <span className="text-foreground/40">/ {total}</span>
</span>
```

- [ ] Substituir os botões de navegação prev/next (linhas 86 e 97):

```tsx
// DE:
className =
  "w-7 h-7 border border-navy flex items-center justify-center text-navy hover:bg-navy hover:text-white transition-colors";

// PARA (ambos os botões):
className =
  "w-7 h-7 border border-foreground/20 flex items-center justify-center text-foreground/60 hover:bg-foreground/10 hover:text-foreground transition-colors";
```

- [ ] Substituir o título da liga (linha 105):

```tsx
// DE:
<h2 className="text-navy font-plex-sans font-bold text-[32px] md:text-[42px] leading-[0.95] tracking-[-0.035em]">

// PARA:
<h2 className="text-foreground font-plex-sans font-bold text-[32px] md:text-[42px] leading-[0.95] tracking-[-0.035em]">
```

- [ ] Substituir a linha de diretores (linha 122):

```tsx
// DE:
<div className="mt-4 font-plex-mono text-[10px] uppercase tracking-[0.1em] text-navy/70 flex gap-3 flex-wrap">

// PARA:
<div className="mt-4 font-plex-mono text-[10px] uppercase tracking-[0.1em] text-foreground/50 flex gap-3 flex-wrap">
```

- [ ] Substituir a borda das stats (linha 131):

```tsx
// DE:
<div className="mt-5 pt-4 border-t border-navy grid grid-cols-3 gap-0">

// PARA:
<div className="mt-5 pt-4 border-t border-foreground/15 grid grid-cols-3 gap-0">
```

- [ ] Substituir o componente `Stat` (linhas 148–155):

```tsx
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pr-4 border-r border-foreground/10 last:border-r-0">
      <div className="font-plex-sans font-bold text-[22px] md:text-[28px] text-foreground tracking-[-0.02em]">
        {value}
      </div>
      <div className="font-plex-mono text-[9px] uppercase tracking-[0.14em] text-foreground/50 mt-0.5">
        {label}
      </div>
    </div>
  );
}
```

- [ ] Typecheck:

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub && npm run typecheck
```

- [ ] Commit:

```bash
git add apps/web/src/pages/home/v1/EditorialHero.tsx
git commit -m "design: EditorialHero dark neutral — remove bg hardcoded and navy colors"
```

---

## Task 4: KpiCard — remover bg-slate-50 e text-navy

**Arquivo:** `apps/web/src/pages/home/KpiCard.tsx`

- [ ] Substituir o ícone wrapper (linha 44):

```tsx
// DE:
<div className="h-8 w-8 rounded-lg bg-slate-50 border border-border flex items-center justify-center mb-3">

// PARA:
<div className="h-8 w-8 rounded-lg bg-background border border-[#191919] flex items-center justify-center mb-3">
```

- [ ] Substituir a linha do valor (linha 48):

```tsx
// DE:
<div className="text-3xl font-bold text-navy leading-none">{value}</div>

// PARA:
<div className="text-3xl font-bold text-foreground leading-none">{value}</div>
```

- [ ] Typecheck e commit:

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub && npm run typecheck
git add apps/web/src/pages/home/KpiCard.tsx
git commit -m "design: KpiCard remove bg-slate-50 and text-navy"
```

---

## Task 5: HomeStaffView (non-v1) — TableRows e text-slate

**Arquivo:** `apps/web/src/pages/home/HomeStaffView.tsx`

- [ ] Linha 191 — remover `bg-slate-50` do `TableRow` do header:

```tsx
// DE:
<TableRow className="bg-slate-50">

// PARA:
<TableRow>
```

- [ ] Linha 214 — `TableRow` condicional com `bg-red-50`:

```tsx
// DE:
<TableRow key={r.liga_id} className={baixa ? "bg-red-50" : undefined}>

// PARA:
<TableRow key={r.liga_id}>
```

- [ ] Linha 228 — `text-slate-700`:

```tsx
// DE:
className={cn(
  "text-sm font-semibold",
  baixa ? "text-red-600" : "text-slate-700",
)}

// PARA:
className={cn(
  "text-sm font-semibold",
  baixa ? "text-red-400" : "text-foreground",
)}
```

- [ ] Linha 235-239 — badge `bg-red-50` e `text-red-600`:

```tsx
// DE:
className = "text-[10px] border-red-300 text-red-600 bg-red-50";

// PARA:
className = "text-[10px] border-red-800/40 text-red-400 bg-transparent";
```

- [ ] Typecheck e commit:

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub && npm run typecheck
git add apps/web/src/pages/home/HomeStaffView.tsx
git commit -m "design: HomeStaffView remove bg-slate-50, bg-red-50, text-slate-700"
```

---

## Task 6: HomeProfessorView (non-v1) — TableRows e rodapé

**Arquivo:** `apps/web/src/pages/home/HomeProfessorView.tsx`

- [ ] Linha 109 — `bg-slate-50` no header TableRow:

```tsx
// DE:
<TableRow className="bg-slate-50">

// PARA:
<TableRow>
```

- [ ] Linhas 144–145 — badges com `bg-amber-50` e `bg-slate-50`:

```tsx
// DE:
? "border-amber-300 text-amber-700 bg-amber-50 text-[10px]"
: "border-slate-300 text-slate-500 bg-slate-50 text-[10px]"

// PARA:
? "border-amber-700/40 text-amber-400 bg-transparent text-[10px]"
: "border-foreground/20 text-foreground/50 bg-transparent text-[10px]"
```

- [ ] Linha 168 — rodapé com `bg-slate-50`:

```tsx
// DE:
<div className="border-t border-border px-4 py-2 bg-slate-50">

// PARA:
<div className="border-t border-[#191919] px-4 py-2 bg-background">
```

- [ ] Typecheck e commit:

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub && npm run typecheck
git add apps/web/src/pages/home/HomeProfessorView.tsx
git commit -m "design: HomeProfessorView remove bg-slate-50 and amber hardcoded"
```

---

## Task 7: HomeStaffViewV1 — botão "Ver todos"

**Arquivo:** `apps/web/src/pages/home/v1/HomeStaffViewV1.tsx`

- [ ] Linha 126 — substituir botão "Ver todos →":

```tsx
// DE:
className =
  "font-plex-mono text-[10px] uppercase tracking-[0.2em] text-navy border-b border-navy pb-0.5";

// PARA:
className =
  "font-plex-mono text-[10px] uppercase tracking-[0.2em] text-foreground/50 border-b border-foreground/20 pb-0.5 hover:text-foreground transition-colors";
```

- [ ] Typecheck e commit:

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub && npm run typecheck
git add apps/web/src/pages/home/v1/HomeStaffViewV1.tsx
git commit -m "design: HomeStaffViewV1 remove text-navy from Ver todos button"
```

---

## Task 8: GerenciamentoStaffPage — inputs e dropdown bg-white

**Arquivo:** `apps/web/src/pages/gerenciamento/GerenciamentoStaffPage.tsx`

- [ ] Linha 121 — constante de estilo do input (`inputClass`):

```tsx
// DE:
"w-full border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60";

// PARA:
"w-full border border-foreground/15 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/40";
```

- [ ] Linha 190 — dropdown do filtro de cor (`bg-white border border-navy/15`):

```tsx
// DE:
<div className="absolute left-0 top-11 z-50 bg-white border border-navy/15 p-3 w-56">

// PARA:
<div className="absolute left-0 top-11 z-50 bg-background border border-foreground/10 p-3 w-56">
```

- [ ] Linha 395 — botão de remover imagem (`bg-white/80 hover:bg-white`):

```tsx
// DE:
className = "absolute top-2 right-2 bg-white/80 hover:bg-white text-red-500 p-1 transition-colors";

// PARA:
className =
  "absolute top-2 right-2 bg-background/80 hover:bg-background text-red-400 p-1 transition-colors";
```

- [ ] Linha 657 — input inline de recurso (`bg-white`):

```tsx
// DE:
className =
  "flex-1 border border-navy/20 px-3 py-1.5 font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60 bg-white";

// PARA:
className =
  "flex-1 border border-foreground/15 px-3 py-1.5 font-plex-sans text-[13px] text-foreground focus:outline-none focus:border-foreground/40 bg-background";
```

- [ ] Typecheck e commit:

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub && npm run typecheck
git add apps/web/src/pages/gerenciamento/GerenciamentoStaffPage.tsx
git commit -m "design: GerenciamentoStaffPage replace bg-white inputs with bg-background"
```

---

## Task 9: RankingLigas e AdministradorPage — text-slate e text-navy residuais

**Arquivos:**

- `apps/web/src/pages/home/RankingLigas.tsx`
- `apps/web/src/pages/administrador/AdministradorPage.tsx`

- [ ] Em `RankingLigas.tsx` linha 45 — `text-slate-700`:

```tsx
// DE:
r.minhaLiga ? "text-navy" : "text-slate-700",

// PARA:
r.minhaLiga ? "text-foreground font-semibold" : "text-foreground",
```

- [ ] Em `RankingLigas.tsx` linha 60 — `bg-slate-300`:

```tsx
// DE:
className={cn("h-1.5", r.minhaLiga ? "[&>div]:bg-navy" : "[&>div]:bg-slate-300")}

// PARA:
className={cn("h-1.5", r.minhaLiga ? "[&>div]:bg-foreground" : "[&>div]:bg-foreground/20")}
```

- [ ] Em `AdministradorPage.tsx` — `text-navy` já é coberto pelo override global em `index.css`, sem mudança necessária.

- [ ] Typecheck e commit:

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub && npm run typecheck
git add apps/web/src/pages/home/RankingLigas.tsx
git commit -m "design: RankingLigas remove text-slate-700 and bg-slate-300"
```

---

## Task 10: primitives.tsx — border-l-navy e hover não cobertos pelo override global

**Arquivo:** `apps/web/src/pages/home/v1/primitives.tsx`

O override global cobre `text-navy` e `border-navy`, mas `border-l-navy` e `hover:bg-navy/[0.03]` têm classes Tailwind diferentes que não são interceptadas.

- [ ] Linha 159 — botão da AlertList (`border-l-navy` e `hover:bg-navy/[0.03]`):

```tsx
// DE:
className =
  "w-full text-left border-b border-navy/15 py-4 pl-4 pr-4 border-l-2 border-l-navy hover:bg-navy/[0.03] transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2";

// PARA:
className =
  "w-full text-left border-b border-foreground/10 py-4 pl-4 pr-4 border-l-2 border-l-foreground/25 hover:bg-foreground/5 transition-colors focus:outline-none focus:ring-1 focus:ring-foreground/20";
```

- [ ] Typecheck e commit:

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub && npm run typecheck
git add apps/web/src/pages/home/v1/primitives.tsx
git commit -m "design: primitives AlertList remove border-l-navy and hover:bg-navy"
```

---

## Task 12: Verificação visual final

- [ ] Iniciar o servidor de desenvolvimento:

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub && npm run dev
```

- [ ] Verificar as seguintes telas no dark mode em `http://localhost:3000`:

  - **Home (Staff):** fundo #101010, cards borda sutil, hero sem bg claro, métricas, alertas
  - **Home (Diretor/Membro):** idem adaptado ao papel
  - **Ligas:** tabelas sem bg-slate no header
  - **Gerenciamento:** inputs com bg-background, dropdown dark
  - **Ranking:** barras com foreground/20

- [ ] Verificar modo claro — nenhuma regressão (todos os `bg-background`, `text-foreground` funcionam em light também).

- [ ] Commit final se tudo OK:

```bash
git add -A
git commit -m "design: dark neutral redesign complete — visual verification passed"
```
