# Ranking Page Redesign

**Date:** 2026-05-08  
**Status:** Approved

## Context

The current RankingPage uses a flat grid with bordered cells for the podium and a custom list with inline progress bars for the full ranking. The rest of the app has migrated to a new design system using shadcn/ui Cards (KpiCard, MinhaLigaCard pattern) and a clean HTML table following the LigasPage pattern. This redesign aligns the Ranking page with those new conventions.

## Design Decisions

### Podium — Option C selected

1st place occupies full width as a prominent card, 2nd and 3rd sit in a 2-column row below. Visual hierarchy makes the winner stand out clearly.

### Table — Option A (lean) selected

Columns: `#`, Liga, Projetos, Presença, Pontuação. Removes Receita and Posts from the table (noise reduction). The full breakdown data is visible in the 1st-place highlight card.

---

## Layout Overview

```
[Page header: "Ranking" + subtitle]

Section 01 — Pódio
  [1st place — full-width Card, brand-yellow left border]
    position badge | avatar (initials) | liga name | proj · presença · receita subtitle
    score (large, right-aligned)
  [2nd place Card (left, link-blue border)] [3rd place Card (right, gray border)]
    same structure, smaller scale

Section 02 — Ranking Completo
  [Table — LigasPage pattern]
    #  | Liga | Projetos | Presença | Pontuação
```

---

## Component Design

### Podium Cards

Use `<Card className="shadow-sm">` from shadcn/ui with `<CardContent>`.

**All cards share this structure:**

- Left border accent via `border-l-4` (yellow for 1st, link-blue for 2nd, gray for 3rd)
- Flex row: position number | avatar square (initials, bg-navy text-white) | name + subtitle | score

**1st place card:**

- `border-l-4 border-brand-yellow`
- Position number: `text-[28px] font-bold text-brand-yellow`
- Avatar: `h-10 w-10` (slightly larger)
- Liga name: `font-plex-sans font-semibold text-[14px] text-navy`
- Subtitle: `font-plex-mono text-[10px] text-navy/50` — shows `N proj · N pres · R$ X receita`
- Score: `font-plex-sans font-bold text-[28px] text-navy`

**2nd and 3rd place cards:**

- `border-l-4 border-link-blue` / `border-l-4 border-brand-gray`
- Position number: `text-[20px] font-bold text-link-blue` / `text-navy/30`
- Avatar: `h-8 w-8` (smaller)
- Score: `font-plex-sans font-bold text-[18px] text-navy`

Grid layout:

```tsx
// 1st: full width
// 2nd + 3rd: grid-cols-2 gap-3
```

### Ranking Table

Follow LigasPage.tsx exactly:

```tsx
<table className="w-full border-collapse">
  <thead>
    <tr className="border-b border-foreground/[0.08]">
      <th className="...font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
```

Columns:
| Column | Content | Alignment |
|--------|---------|-----------|
| `#` | Position badge with `corBadge()` color | left, w-14 |
| `Liga` | Nome + optional "Minha" badge | left |
| `Projetos` | `concluidos + em_andamento` | left, font-plex-mono |
| `Presença` | `presencas` count | left, font-plex-mono |
| `Pontuação` | `formatarPontos(pontuacao)` bold | right |

No action dropdown — ranking is read-only.

Position badge uses existing `corBadge()` function (already in the file).

---

## Files to Modify

- `apps/web/src/pages/ranking/RankingPage.tsx` — full rewrite of JSX, keep data-fetching logic and helper functions

## Functions to Keep

- `getToken()` — unchanged
- `iniciais()` — unchanged
- `formatarMoeda()` — used in 1st place subtitle
- `formatarPontos()` — unchanged
- `corBadge()` — unchanged

## Verification

1. Run `npm run dev`
2. Navigate to `/ranking`
3. Confirm: 1st place card is full-width with yellow left border
4. Confirm: 2nd and 3rd are in a 2-column row below
5. Confirm: Table shows `#`, Liga, Projetos, Presença, Pontuação columns
6. Confirm: Position badges are color-coded (yellow/blue-ish/gray)
7. Run `npm run typecheck` — no type errors
