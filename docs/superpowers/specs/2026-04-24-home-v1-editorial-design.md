# Home V1 — Editorial (estilo LSB)

**Data:** 2026-04-24
**Status:** Aprovado para implementação
**Autor:** Diogo (com assistência de Claude)

---

## Contexto

A Home atual (`/home`) tem um carrossel de ligas funcional, mas visualmente genérico e não alinhado com a identidade do site da faculdade (https://lsb.edu.br). O objetivo é criar uma variação V1 da Home inspirada na linguagem editorial da LSB, para ser comparada lado-a-lado com a Home atual antes de decidir por uma substituição definitiva.

## Objetivo

Entregar uma nova rota `/home/v1` que renderize a Home inteira com:

- Carrossel de ligas em formato "Editorial Hero" (tipografia gigante, índice mono, autoplay via `embla-carousel-autoplay`)
- Header, "Minha Liga" e views por papel (Staff / Diretor / Professor / Membro) repensadas no mesmo estilo editorial
- Paleta e tipografia fiéis à LSB (navy + branco + soft bege; IBM Plex Sans + IBM Plex Mono)

A Home original em `/home` **continua intocada**. V1 vive em paralelo em `/home/v1`.

## Escopo

**Incluso:**

- Nova rota `/home/v1` registrada em `apps/web/src/router/index.tsx` sob `AppLayout` + `ProtectedRoute`
- Diretório `apps/web/src/pages/home/v1/` com os componentes novos
- Instalação de `embla-carousel-react` + `embla-carousel-autoplay`
- Instalação de `@fontsource/ibm-plex-sans` + `@fontsource/ibm-plex-mono` (self-hosted)
- Registro das fontes em `tailwind.config.ts` como `font-plex-sans` e `font-plex-mono`
- Reuso das views por papel existentes (`HomeStaffView` etc.) — zero mudança nelas nesta etapa

**Fora de escopo:**

- Substituir a `/home` atual
- Refatorar views por papel (Staff/Diretor/Professor/Membro) — elas entram embutidas como estão
- Alterar design system global (tokens Tailwind, shadcn, componentes compartilhados)
- Tocar backend / API

## Arquitetura

```
apps/web/src/pages/home/v1/
├── HomeV1Page.tsx          # orquestra fetch + layout; exporta { HomeV1Page }
├── EditorialHero.tsx       # carrossel embla + hero tipográfico
├── MinhaLigaStrip.tsx      # faixa "Minha liga · nome · acessar →"
└── useHomeData.ts          # hook extraído do HomePage atual (fetch ligas + minha liga + nome usuário)
```

**`HomeV1Page`** renderiza, na ordem:

1. Header editorial: `Olá, {nome}` (Plex Sans 22px 600) + data (Plex Mono 10px uppercase) + badge de papel em caixa mono
2. Divisor 1px navy
3. `<EditorialHero ligas={ligas} />` — só se `ligas.length > 0`
4. `<MinhaLigaStrip liga={minhaLiga} />` — só se `minhaLiga`
5. View por papel existente (`HomeStaffView`, `HomeDiretorView`, `HomeProfessorView`, `HomeMembroView`) — importadas do diretório pai sem modificação

**`EditorialHero`:**

- Props: `{ ligas: Liga[] }`
- Usa `useEmblaCarousel` + plugin `Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })`
- Loop infinito (`loop: true`)
- Layout por slide:
  - Card com background `#f5f5f3`, padding 26px, radius 4px
  - Topo: índice `NN / TT` (Plex Mono 11px tracking 0.14em) + setas ‹/› (botões 26x26 borda navy 1px)
  - Headline: nome da liga em 3 linhas — primeira palavra + palavra em `<em>` itálico peso 500 + resto em lowercase peso 500. Tipografia: Plex Sans 42px 700 tracking -0.035em line-height 0.95.
    - **Regra de quebra**: nome dividido por espaço. Se ≥2 palavras, segunda palavra recebe `<em>`. Se ≥3 palavras, terceira+ ficam lowercase. Fallback: nome inteiro sem estilização especial.
  - Meta: diretor(es) + "Desde {ano fundação}" em Plex Mono 10px uppercase separado por bullets
  - Stats: grid 3 colunas (Score / Projetos / Membros) com borda top navy, números 28px 700
- Click no card → `navigate('/ligas/:id')`
- Setas: click para (prev)/(next), mantêm autoplay
- `aria-label` em cada botão; foco visível com outline navy

**`MinhaLigaStrip`:**

- Props: `{ liga: Liga }`
- Render: linha horizontal navy top, padding 18px 26px
- Esquerda: eyebrow "Minha liga" (mono) + nome (Plex Sans 14px 600)
- Direita: `Acessar →` (mono 10px uppercase, border-bottom navy 1px)
- Click → `navigate('/ligas/:id')`

**`useHomeData`:**

- Extrai a lógica de `HomePage.tsx` (fetch de `/api/ligas`, `/api/ligas/minha`, nome do usuário)
- Retorna `{ ligas, minhaLiga, nomeUsuario, loadingUser, pendentes }`
- **Não altera** `HomePage.tsx` — a duplicação é aceita para manter `/home` 100% isolada de mudanças

## Dados

Mesmas chamadas da Home atual:

- `GET /api/ligas` (autenticado) → `Liga[]`
- `GET /api/ligas/minha` (autenticado) → `Liga | null`
- `GET /api/pendentes` (apenas se `role === 'staff'`)
- Supabase direto para buscar `nome` do usuário logado

Nenhuma mudança na API.

## Tipografia e estilo

- **Fontes novas** (self-hosted via `@fontsource`):
  - `IBM Plex Sans` pesos 400, 500, 600, 700
  - `IBM Plex Mono` pesos 400, 500
- **Tailwind config**: adicionar em `apps/web/tailwind.config.ts`:
  ```ts
  fontFamily: {
    'plex-sans': ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
    'plex-mono': ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
  }
  ```
- **Imports**: em `apps/web/src/main.tsx` adicionar imports dos pesos usados
- **Cores**: reusa tokens existentes (`text-navy`, `bg-navy`). Fundo bege do hero entra como classe arbitrária `bg-[#f5f5f3]` (evitamos poluir tailwind.config com token novo nesta etapa).

## Tratamento de erros / edge cases

- Se `ligas.length === 0` → não renderiza hero (igual Home atual)
- Se `minhaLiga === null` → não renderiza strip
- Se `ligas.length === 1` → hero renderiza sem autoplay nem setas (mas mantém índice `01 / 01`)
- Carregamento: skeletons no header (igual Home atual). Hero não mostra skeleton — só aparece quando `ligas` chegou.
- Falha de fetch: silenciosa, mesmo padrão do `HomePage.tsx` atual

## Responsividade

- Desktop (≥768px): layout como nos mockups
- Mobile: título do hero cai para 32px, stats ficam grid 3x1 em fonte menor (20px), padding reduzido para 18px
- Breakpoint único: `md:` (768px) — não introduzimos breakpoints novos

## Testes

Testes mínimos em `apps/web/src/pages/home/v1/__tests__/`:

- `EditorialHero.test.tsx`:
  - Renderiza nome da liga corretamente
  - Navega para `/ligas/:id` ao clicar
  - Seta próxima avança slide (mock de embla ok)
- `MinhaLigaStrip.test.tsx`:
  - Renderiza nome e navega ao clicar
- `HomeV1Page.test.tsx`:
  - Não quebra quando fetch falha
  - Não renderiza hero quando `ligas.length === 0`

Sem testes E2E nesta etapa.

## Acessibilidade

- Setas do carrossel: `<button>` com `aria-label="Liga anterior"` / `"Próxima liga"`
- Autoplay: `aria-live="polite"` no container do slide para anunciar mudanças, mas respeita `prefers-reduced-motion` — se usuário tem reduced motion, autoplay desligado
- Foco visível: outline navy 2px offset 2px em todos os botões/cards clicáveis
- Contraste: navy `#10284E` sobre `#fff` e `#f5f5f3` passa AA

## Critérios de aceitação

1. Acessar `/home/v1` renderiza página completa sem erros de console
2. Carrossel avança automaticamente a cada 4s, pausa no hover
3. Setas manuais funcionam e navegam o slide
4. Click no card do hero → navega para detalhe da liga
5. `/home` original continua intocada
6. `npm run typecheck` passa
7. `npm run lint` passa
8. Visual confere com V1 do mockup em `.superpowers/brainstorm/*/content/lsb-directions.html`

---

## Riscos conhecidos

- **Duplicação de lógica de fetch** entre `HomePage.tsx` e `HomeV1Page.tsx` via hook compartilhado — aceitável e removível quando V1 substituir V0.
- **Peso das fontes**: adicionar 2 famílias (Plex Sans + Mono) com múltiplos pesos aumenta bundle. Mitigação: importar só pesos usados (400, 500, 600, 700 sans + 400, 500 mono); subset latin apenas.
- **Heurística de itálico na segunda palavra** pode quebrar em nomes curtos/estranhos ("Liga X"). Fallback para nome inteiro cobre o caso.
