# App Redesign — Dark Neutral

**Data:** 2026-05-07
**Escopo:** App inteira (layout, sidebar, todas as páginas)
**Status:** Aprovado para implementação

---

## Visão geral

Redesign completo da plataforma Link Leagues seguindo a direção **Neutro Escuro** — inspirado na referência "Programa". O objetivo é uma UI dark de alta qualidade onde a hierarquia visual vem de tipografia e espaçamento, não de cores de destaque.

---

## Design tokens

| Token             | Valor     | Uso                                     |
| ----------------- | --------- | --------------------------------------- |
| `sidebar-bg`      | `#040404` | Background da sidebar                   |
| `page-bg`         | `#101010` | Background das páginas                  |
| `card-bg`         | `#101010` | Background dos cards (igual ao page-bg) |
| `card-border`     | `#191919` | Borda mínima dos cards e painéis        |
| `divider`         | `#1a1a1a` | Linhas divisórias entre seções          |
| `nav-active-bg`   | `#141414` | Background do item de nav ativo         |
| `sidebar-border`  | `#1a1a1a` | Borda direita da sidebar                |
| `text-primary`    | `#ffffff` | Texto principal                         |
| `text-secondary`  | `#555555` | Texto de suporte, labels, datas         |
| `text-nav`        | `#666666` | Itens de nav inativos                   |
| `text-nav-active` | `#ffffff` | Item de nav ativo                       |

Todos os tokens já existem como variáveis CSS (`--background`, `--sidebar-background`, etc.) em `apps/web/src/index.css`. O redesign alinha os tokens existentes e remove usos hardcoded de cores da marca (navy, link-blue) fora dos gradientes de ligas.

---

## Sidebar

**Estrutura:**

```
[Logo + subtítulo]
─────────────────
PLATAFORMA        ← section label: 9px, #3a3a3a, uppercase
  ⌂  Home         ← nav item: 12px, ícone Lucide 14px, gap 9px
  ◎  Ligas
  ▤  Projetos
  ◷  Agenda
  ▣  Mural
  ↗  Ranking

GESTÃO
  ✦  Super Admin
  ◈  Formulários
  ⚙  Gerenciamento
─────────────────
[Avatar  Nome  Papel]   ← rodapé do usuário
```

**Especificações:**

- Largura: `220px` (mantém o valor atual)
- Background: `#040404`
- Borda direita: `1px solid #1a1a1a`
- Logo: `font-size 13px`, `font-weight 700`, `color #fff`; subtítulo `10px #444`
- Section labels: `9px`, `color #3a3a3a`, `letter-spacing 0.12em`, `text-transform uppercase`
- Nav item: `padding 6px 10px`, `border-radius 6px`, `font-size 12px`
- Nav inativo: `color #666`, ícone `opacity 0.7`
- Nav ativo: `background #141414`, `color #fff`, ícone `opacity 1`
- Rodapé: avatar `28px × 28px`, `border-radius 6px`, `background #1e1e1e`, `border 1px solid #2a2a2a`

**Remoções:** Remover qualquer uso de `bg-navy`, `text-link-blue` como cor de destaque na sidebar. O item ativo não usa cor de destaque — só o background sutil `#141414`.

---

## Topbar

- Altura: `40px`
- Background: `#101010` (igual à página)
- Borda inferior: `1px solid #191919`
- Conteúdo: apenas o `SidebarTrigger` + separador vertical — sem breadcrumbs nem título de página

---

## Cards e painéis

**Regra central:** background do card = background da página (`#101010`). A separação visual vem apenas da borda.

- Background: `#101010`
- Border: `1px solid #191919`
- Border-radius: `8px`
- Padding interno: `14px 16px`
- Sem `box-shadow`

**Section labels** (acima de grupos de cards):

- `9px`, `color #444`, `text-transform uppercase`, `letter-spacing 0.12em`
- `margin-bottom: 10px`

**Stats dentro de cards:** mesma cor de fundo (`#101010`), borda `1px solid #191919`, `border-radius 6px`.

---

## Tipografia de página

- Título de página (`h1`): `font-size 20px`, `font-weight 700`, `color #fff`, `letter-spacing -0.02em`
- Subtítulo/data: `10px`, `color #444`, `text-transform uppercase`, `letter-spacing 0.08em`
- Role badge: `9px`, `border 1px solid #222`, `color #555`, `padding 3px 8px`, `border-radius 4px`

Remover `text-navy` dos títulos de página em todas as views. Usar `text-foreground` (branco no dark mode).

---

## Home page (HomeV1Page)

O layout da home permanece o mesmo (hero carousel + métricas + alertas), com os seguintes ajustes visuais:

**Hero carousel (EditorialHero):**

- Container: `background #101010`, `border 1px solid #191919`, `border-radius 10px`
- Slide: gradient neutro `#151515 → #1c1c1c` (sem navy/link-blue)
- Stats do slide: linha horizontal abaixo do slide, separadas por `border-right 1px solid #191919`
- Dots: barra de 3px de altura, ativa `#fff`, inativa `#2a2a2a`

**Métricas (KpiCard / MetricCard):**

- Grid 4 colunas
- Card: `background #101010`, `border 1px solid #191919`, `border-radius 8px`, `padding 14px 16px`
- Valor: `22px bold #fff`; label: `9px #555 uppercase`

**Alertas:**

- Lista simples sem `bg-amber-50` — usar `background #101010`, `border 1px solid #191919`
- Dot indicador: `6px`, `background #555`
- Remover cores amber/red hardcoded dos alertas

---

## Outras páginas

Todas as páginas internas seguem os mesmos tokens:

- Fundo `#101010`, cards `#101010` com border `#191919`
- Títulos `text-foreground` (branco), labels `#555`
- Tabelas: header `background #101010`, borda `#191919`; remover `bg-slate-50` de `TableRow` de header

---

## Remoções globais

| Classe / padrão                            | Substituição                                   |
| ------------------------------------------ | ---------------------------------------------- |
| `bg-white`                                 | `bg-background`                                |
| `bg-slate-50`, `bg-slate-100`              | `bg-background` ou remover                     |
| `text-navy` em títulos de página           | `text-foreground`                              |
| `text-link-blue` em labels de seção        | `text-muted-foreground` ou `color #444` inline |
| `bg-amber-50 border-amber-200` nos alertas | `bg-background border-border`                  |
| `text-slate-700`, `text-slate-500`         | `text-foreground` / `text-muted-foreground`    |

Os overrides globais de `.dark .text-navy` já adicionados em `index.css` cobrem casos residuais.

---

## Arquivos a modificar

**CSS / tokens:**

- `apps/web/src/index.css` — já atualizado (dark tokens + overrides navy)

**Layout:**

- `apps/web/src/layouts/AppLayout.tsx` — topbar border `#191919`
- `apps/web/src/components/app-sidebar.tsx` — logo, rodapé de usuário
- `apps/web/src/components/nav-main.tsx` — estilos de nav item
- `apps/web/src/components/nav-user.tsx` — rodapé

**Home (v1):**

- `apps/web/src/pages/home/v1/HomeV1Page.tsx` — já atualizado (`bg-background`)
- `apps/web/src/pages/home/v1/EditorialHero.tsx` — remover navy do gradiente e borders
- `apps/web/src/pages/home/v1/primitives.tsx` — remover `text-navy`, `border-navy`
- `apps/web/src/pages/home/v1/HomeStaffViewV1.tsx` — remover `bg-amber-50`
- `apps/web/src/pages/home/v1/HomeDiretorViewV1.tsx` — idem
- `apps/web/src/pages/home/v1/HomeProfessorViewV1.tsx` — idem
- `apps/web/src/pages/home/v1/HomeMembroViewV1.tsx` — idem
- `apps/web/src/pages/home/KpiCard.tsx` — remover `bg-slate-50`

**Outras páginas:**

- `apps/web/src/pages/home/HomeStaffView.tsx` — `bg-slate-50` no TableRow
- `apps/web/src/pages/home/HomeProfessorView.tsx` — idem
- Demais páginas (`ligas/`, `projetos/`, `agenda/`, etc.) — revisão pontual de `bg-white`, `bg-slate-*`

---

## O que NÃO muda

- Cores dos badges de status (verde, amarelo, vermelho) — informação semântica
- Lógica de roteamento, autenticação, dados
- Estrutura de componentes — apenas estilos

> **Nota sobre gradientes de liga:** O hero do carousel (EditorialHero) usa gradient neutro `#151515 → #1c1c1c` para consistência com o design system. Páginas de detalhe de liga (`/ligas/:id`) podem manter o gradiente navy→link-blue como identidade da liga — isso é decidido por página, não globalmente.
