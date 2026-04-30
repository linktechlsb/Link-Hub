# Design: Home Page + Página de Liga (Visão do Membro)

**Data:** 2026-04-13  
**Status:** Aprovado

---

## Contexto

A plataforma Link Leagues não tinha uma experiência dedicada para membros de liga. As telas existentes (`/home` e `/ligas`) foram pensadas de forma genérica. O objetivo é criar:

1. Uma **Home Page** que mostre todas as ligas em carrossel e destaque os dados da liga do próprio membro.
2. Uma **Página de Detalhe da Liga** (`/ligas/:id`) com sub-abas para o membro explorar o conteúdo da liga.

---

## Tela 1 — Home Page (`/home`)

### Layout: 3 Zonas Verticais

```
┌─ Sidebar ─┬──────────────────────────────────────────┐
│           │  Olá, Rafael 👋                          │
│           │  Explore as ligas da plataforma          │
│           ├──────────────────────────────────────────┤
│  Nav      │  ZONA 1: CARROSSEL (full-width)          │
│  Icons    │  ┌────────────────────────────────────┐  │
│           │  │  Liga de Finanças                  │  │
│           │  │  Líder: Ana · 14 membros  92 3 87% │  │
│           │  └────────────────────────────────────┘  │
│           │  ● ○ ○ ○ ○  (dots)                      │
│           ├──────────────────────────────────────────┤
│           │  ZONA 2: MINHA LIGA                      │
│           │  ┌────────────────────────────────────┐  │
│           │  │ Liga de Marketing    [Ver detalhes] │  │
│           │  │  78pts  5proj  91%  Sex             │  │
│           │  │  📅 Reunião Semanal — Sex 18h S204  │  │
│           │  └────────────────────────────────────┘  │
│           ├──────────────────────────────────────────┤
│           │  ZONA 3: DESTAQUES DA SEMANA             │
│           │  [↑ Score] [✅ Projeto] [🏆 Ranking]    │
└───────────┴──────────────────────────────────────────┘
```

### Zona 1 — Carrossel de Ligas

- Ocupa **100% da largura** do content area
- Um card por vez, com transição horizontal
- **Auto-avanço a cada 1,5 segundos**
- Setas ‹ › para navegação manual
- Dots indicadores de posição
- Cada card exibe: imagem/cor da liga, nome, líder, nº de membros, score, projetos ativos, % presença
- Clicar no card → navega para `/ligas/:id`
- Dados: `GET /ligas` (já existente)

### Zona 2 — Minha Liga

- Card dedicado à liga à qual o membro pertence
- Header em gradiente navy com nome da liga e botão "Ver detalhes →"
- 4 métricas inline: Score · Projetos Ativos · % Presença · Próximo Evento
- Footer com o próximo evento: data, hora e sala
- Botão "Ver detalhes" → `/ligas/:id` da liga do membro
- Dados: `GET /ligas/:id` filtrado pela liga do membro (via `liga_membros`)

### Zona 3 — Destaques da Semana

- 3 cards compactos: variação de score, projeto concluído, movimentação no ranking
- Dados: fictícios na primeira versão, substituídos em iteração futura

---

## Tela 2 — Página de Detalhe da Liga (`/ligas/:id`)

### Layout

```
┌─ Sidebar ─┬──────────────────────────────────────────┐
│           │  [← Home]                                │
│           │  ┌─ HERO (gradiente navy) ─────────────┐ │
│           │  │  Liga de Marketing    [Minha Liga]   │ │
│           │  │  Líder: Pedro Lima · 18 membros      │ │
│           │  └──────────────────────────────────────┘ │
│           ├──────────────────────────────────────────┤
│  Nav      │  [Visão Geral][Líder][Membros][Presença] │
│  Icons    │  [Projetos][Recursos]                    │
│           ├──────────────────────────────────────────┤
│           │  <conteúdo da aba selecionada>           │
└───────────┴──────────────────────────────────────────┘
```

### Sub-abas

| Aba             | Conteúdo                                                               |
| --------------- | ---------------------------------------------------------------------- |
| **Visão Geral** | 4 metric cards + card do próximo evento                                |
| **Líder**       | Perfil do líder + lista de diretores                                   |
| **Membros**     | Tabela: nome · cargo · data de ingresso                                |
| **Presença**    | Tabela: membro · status (presente/ausente/justificado) · justificativa |
| **Projetos**    | Lista de projetos: nome · responsável · prazo · status · % conclusão   |
| **Recursos**    | Links: título · tipo (curso/vídeo/doc) · autor · botão abrir           |

### Aba Visão Geral — Métricas

| Métrica            | Valor                                                        | Fonte                                 |
| ------------------ | ------------------------------------------------------------ | ------------------------------------- |
| Projetos Ativos    | contagem de projetos com `status = 'em_andamento'`           | `GET /projetos?liga_id=:id`           |
| Score              | fórmula: faturamento/membro + presença + projetos concluídos | fictício por ora                      |
| Presença           | % de `presente` sobre total de registros da liga             | `GET /presenca?liga_id=:id`           |
| Faturamento/Membro | valor em R$                                                  | fictício por ora (campo a ser criado) |

### Próximo Evento

- Card com: data grande (dia + mês), nome do evento, dia da semana, hora, sala
- Dados: `GET /presenca` eventos futuros da liga (tabela `eventos`)

---

## Dados e Endpoints

### Endpoints Existentes (reutilizar)

- `GET /ligas` — lista todas as ligas ativas com `projetos_ativos` e diretores
- `GET /ligas/:id` — detalhe da liga com membros

### Endpoints a Criar

- `GET /ligas/:id/membros` — membros da liga com cargo e data de ingresso
- `GET /ligas/:id/presenca` — registros de presença por evento
- `GET /ligas/:id/projetos` — projetos da liga
- `GET /ligas/:id/recursos` — recursos (links) da liga
- `GET /ligas/:id/eventos/proximo` — próximo evento futuro da liga

### Novos Tipos Necessários

- `Recurso` em `packages/types/src/recurso.ts`: `{ id, liga_id, titulo, tipo, url, criado_por, criado_em }`
- Campo `score` na `Liga` (calculado ou fictício inicial)

### Novas Tabelas Necessárias

- `recursos`: `id, liga_id, titulo, tipo (curso|video|documento|link), url, criado_por, criado_em`

---

## Roteamento

| Rota         | Componente                  | Notas                     |
| ------------ | --------------------------- | ------------------------- |
| `/home`      | `HomePage.tsx` (reescrever) | Substituir conteúdo atual |
| `/ligas/:id` | `LigaDetailPage.tsx` (novo) | Nova rota no router       |

---

## Arquivos a Criar / Modificar

### Criar

- `apps/web/src/pages/home/HomePage.tsx` — reescrever com 3 zonas
- `apps/web/src/pages/ligas/LigaDetailPage.tsx` — nova página com sub-abas
- `apps/web/src/pages/ligas/tabs/VisaoGeralTab.tsx`
- `apps/web/src/pages/ligas/tabs/LiderTab.tsx`
- `apps/web/src/pages/ligas/tabs/MembrosTab.tsx`
- `apps/web/src/pages/ligas/tabs/PresencaTab.tsx`
- `apps/web/src/pages/ligas/tabs/ProjetosTab.tsx`
- `apps/web/src/pages/ligas/tabs/RecursosTab.tsx`
- `packages/types/src/recurso.ts`
- `apps/api/src/routes/ligas.ts` — adicionar novos endpoints de detalhe

### Modificar

- `apps/web/src/router/index.tsx` — adicionar rota `/ligas/:id`
- `packages/types/src/index.ts` — exportar `Recurso`

---

## Dados Fictícios (primeira versão)

Os seguintes campos usarão valores hardcoded até as páginas de input serem criadas:

- Score da liga
- Faturamento por membro
- Destaques da semana (Zona 3 da Home)

---

## Verificação

1. `pnpm dev` — abrir `http://localhost:3000/home`
   - Carrossel aparece full-width, avança automaticamente a cada 1,5s
   - Clique no card navega para `/ligas/:id`
   - Card "Minha Liga" exibe dados corretos da liga do membro logado
2. Navegar para `/ligas/:id`
   - Hero exibe nome, líder, badge "Minha Liga" (se aplicável)
   - 6 abas visíveis e clicáveis
   - Cada aba exibe seu conteúdo correto
   - Aba Presença exibe tabela com status coloridos
3. `pnpm typecheck` — sem erros de tipo
