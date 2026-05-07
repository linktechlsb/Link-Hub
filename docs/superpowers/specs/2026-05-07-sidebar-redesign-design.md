# Sidebar Redesign — Design Spec

**Data:** 2026-05-07

## Contexto

A aplicação usa atualmente uma sidebar single-panel com fundo navy (`#10284E`), colapsável apenas para modo ícone. O objetivo é substituir pelo padrão sidebar-08 do shadcn/ui e introduzir um novo sistema de cores minimalista com suporte a light/dark mode.

## Sistema de Cores

### Light Mode

| Token            | Valor     |
| ---------------- | --------- |
| Background (app) | `#FBFBFB` |
| Page / Cards     | `#FFFFFF` |
| Sidebar          | `#FFFFFF` |

### Dark Mode

| Token            | Valor     |
| ---------------- | --------- |
| Background (app) | `#040404` |
| Page / Cards     | `#101010` |
| Sidebar          | `#101010` |

Sem navy ou amarelo por enquanto — apenas essas 4 cores formam a base visual.

## Sidebar

- **Componente:** shadcn sidebar-08 (`npx shadcn@latest add sidebar-08`)
- **Comportamento:** `collapsible="offcanvas"` — sidebar fecha completamente ao clicar no toggle
- **Cor:** Adapta ao tema (branco no light mode, `#101010` no dark mode)
- **Lógica preservada:** itens de nav, role-based menu (staff/diretor), user data fetch, FeedbackDialog

## Arquivos a Modificar

1. `apps/web/src/index.css` — novos CSS vars para as 4 cores
2. `apps/web/src/components/app-sidebar.tsx` — usar sidebar-08 pattern, remover inline CSS vars navy, trocar `collapsible="icon"` por `"offcanvas"`
3. `apps/web/src/layouts/AppLayout.tsx` — atualizar header/main com novas cores
4. `apps/web/tailwind.config.ts` — garantir que as cores #FBFBFB, #040404, #101010 são tokens

## O que NÃO muda

- Estrutura de rotas e navegação
- Lógica de autenticação no AppLayout
- Componentes de página individuais
- Cores navy/amarelo nos componentes de UI internos das páginas (não tocamos nas páginas por enquanto)
