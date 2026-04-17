# Link Leagues Platform — CLAUDE.md

## Visão Geral

Link Leagues Platform é um sistema centralizado de gestão das ligas acadêmicas da **Link — Faculdade de Negócios**. Cobre administração de ligas, acompanhamento de projetos, controle de presença, agendamento de salas e progressão de membros.

O repositório é um **monorepo npm workspaces** com frontend React e API Express, ambos em TypeScript, compartilhando tipos e utilitários via pacotes locais do workspace.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18.3 + TypeScript + Vite |
| Estilização | Tailwind CSS v3 + shadcn/ui |
| Roteamento | React Router v6 |
| Backend | Node.js + Express + TypeScript |
| Banco de Dados | PostgreSQL via Supabase |
| Autenticação | Supabase Auth + JWT |
| Monorepo | npm workspaces |

---

## Estrutura do Monorepo

```
link-leagues-platform/
├── apps/
│   ├── web/                     # @link-leagues/web — React + Vite, porta 3000
│   │   └── src/
│   │       ├── pages/           # Uma pasta por rota (auth/, dashboard/, ligas/, projetos/, presenca/, salas/)
│   │       ├── layouts/         # AppLayout.tsx (sidebar), AuthLayout.tsx (card centralizado)
│   │       ├── lib/             # supabase.ts (client anon), utils.ts (cn helper)
│   │       └── router/          # index.tsx — configuração do createBrowserRouter
│   └── api/                     # @link-leagues/api — Express, porta 3001
│       └── src/
│           ├── routes/          # index.ts (mount), ligas.ts, projetos.ts, presenca.ts, salas.ts
│           ├── middleware/      # auth.ts (authenticate + requireRole), errorHandler.ts
│           ├── config/          # supabase.ts (supabaseAdmin + supabaseAnon)
│           └── index.ts         # Bootstrap do Express
└── packages/
    ├── types/                   # @link-leagues/types — interfaces e tipos TypeScript compartilhados
    │   └── src/                 # user.ts, liga.ts, projeto.ts, presenca.ts, sala.ts, index.ts
    ├── utils/                   # @link-leagues/utils — funções utilitárias compartilhadas
    └── ui/                      # @link-leagues/ui — componentes base (Badge, Button)
```

---

## Comandos de Desenvolvimento

```bash
npm run dev        # Roda frontend + API simultaneamente
npm run dev:web    # Apenas frontend (porta 3000)
npm run dev:api    # Apenas API (porta 3001)
npm run build      # Build de todos os pacotes
npm run build:web  # Build apenas do frontend
npm run build:api  # Build apenas da API
npm run typecheck  # Type-check de todos os pacotes
npm run lint       # Lint de todos os pacotes
npm run clean      # Remove dist/ e node_modules
```

A API usa `tsx watch` em dev (hot reload). O frontend usa Vite com HMR.

---

## Design System

### Cores da Marca

| Token | Hex | Classe Tailwind | Uso |
|-------|-----|-----------------|-----|
| Navy | `#10284E` | `bg-navy` / `text-navy` | Principal — sidebar, botões primários, headings |
| Link Blue | `#546484` | `bg-link-blue` / `text-link-blue` | Secundário — elementos de suporte |
| Amarelo | `#FEC641` | `bg-brand-yellow` | Apoio — destaques, alertas, badges |
| Cinza | `#EAEAEA` | `bg-brand-gray` / `border-brand-gray` | Neutro — bordas, fundos suaves |

Navy tem escala completa (`navy-50` a `navy-900`). Link Blue tem variantes `link-blue-light` e `link-blue-dark`.

Os tokens semânticos do shadcn/ui mapeiam para a marca:
- `primary` → navy (`#10284E`)
- `secondary` → link-blue (`#546484`)
- `accent` → brand-yellow (`#FEC641`)
- `muted` / `border` → brand-gray (`#EAEAEA`)

### Tipografia

- `font-display` → **Aeonik** (fallback: Montserrat) — headings (`h1`–`h6`) e logo da sidebar
- `font-sans` → **Montserrat** — todo o texto do corpo

Sempre use `font-display font-bold` para títulos de página. Nunca hardcode nomes de fonte fora do `tailwind.config.ts`.

### Padrão de Layout de Página

Toda página dentro do `AppLayout` segue:
```tsx
<div className="p-8">
  <div className="mb-6">
    <h1 className="font-display font-bold text-2xl text-navy">Título da Página</h1>
    <p className="text-muted-foreground text-sm mt-1">Subtítulo</p>
  </div>
  {/* conteúdo da página */}
</div>
```

### Componentes

- Todos os componentes shadcn/ui são instalados via `npm dlx shadcn@latest add <component>` dentro de `apps/web`
- Quando um componente é usado em múltiplos apps, promova para `packages/ui/src/` e re-exporte de `packages/ui/src/index.ts`
- Use o helper `cn()` de `@/lib/utils` (clsx + twMerge) para classes Tailwind condicionais
- Ícones: **Lucide React** exclusivamente — nunca instale outras bibliotecas de ícones

---

## Papéis e Permissões

| Papel | Permissões |
|-------|-----------|
| `admin` | Acesso total — ligas, projetos, presença, salas e usuários |
| `lider` | Liga própria — gerenciar projetos, presença e reservas de salas |
| `membro` | Leitura — projetos e presença da própria liga |

Papéis ficam em `user_metadata.role` no Supabase e são expostos via middleware `authenticate` como `req.user.role`.

Aplicação de papéis na API usa dois middlewares de `src/middleware/auth.ts`:
- `authenticate` — valida o Bearer token, popula `req.user`
- `requireRole(...roles)` — bloqueia a rota para papéis específicos

---

## Convenções Arquiteturais

### Onde Colocar Cada Coisa

| O quê | Onde |
|-------|------|
| Tipos e interfaces TypeScript compartilhados | `packages/types/src/` — um arquivo por domínio |
| Funções utilitárias puras (sem UI) | `packages/utils/src/index.ts` |
| Componentes base de UI compartilhados | `packages/ui/src/` |
| Componentes de página do frontend | `apps/web/src/pages/<modulo>/` |
| Layouts do frontend | `apps/web/src/layouts/` |
| Roteamento do frontend | `apps/web/src/router/index.tsx` |
| Cliente Supabase do frontend (anon) | `apps/web/src/lib/supabase.ts` |
| Handlers de rota da API | `apps/api/src/routes/<modulo>.ts` |
| Middleware da API | `apps/api/src/middleware/` |
| Clientes Supabase da API | `apps/api/src/config/supabase.ts` |

### Adicionando um Novo Módulo

1. Adicionar tipos em `packages/types/src/<modulo>.ts` e exportar de `packages/types/src/index.ts`
2. Criar rotas da API em `apps/api/src/routes/<modulo>.ts` usando o padrão `authenticate` + `requireRole`
3. Montar o router em `apps/api/src/routes/index.ts`
4. Adicionar utilitários em `packages/utils/src/index.ts` se necessário
5. Criar o componente de página em `apps/web/src/pages/<modulo>/<Modulo>Page.tsx`
6. Registrar a rota em `apps/web/src/router/index.tsx` sob `AppLayout`
7. Adicionar o item de nav em `AppLayout.tsx` no array `navItems`

### Padrão de Route Handler na API

```ts
router.get("/<path>", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from("tabela").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err); // sempre delegar ao errorHandler
  }
});
```

---

## Padrões do Supabase

### Frontend (client anon)

`apps/web/src/lib/supabase.ts` exporta um único client `supabase` inicializado com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Use para:
- `supabase.auth.signInWithPassword()` — login
- `supabase.auth.signOut()` — logout
- `supabase.auth.onAuthStateChange()` — gerenciamento de sessão

O frontend **não** acessa o banco diretamente — todo fetch de dados vai pela API.

### API (service role + anon)

`apps/api/src/config/supabase.ts` exporta dois clients:
- `supabaseAdmin` — service role key, bypassa Row Level Security. Use para **todas** as operações de banco nos handlers.
- `supabaseAnon` — usado **somente** em `middleware/auth.ts` para chamar `supabaseAnon.auth.getUser(token)`. Nunca use para queries de banco.

### Variáveis de Ambiente

| Variável | Localização | Descrição |
|----------|------------|-----------|
| `VITE_SUPABASE_URL` | `apps/web/.env.local` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | `apps/web/.env.local` | Chave anon pública |
| `SUPABASE_URL` | `apps/api/.env` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | `apps/api/.env` | Chave anon (somente validação de token) |
| `SUPABASE_SERVICE_ROLE_KEY` | `apps/api/.env` | Service role key (nunca expor ao frontend) |
| `API_PORT` | `apps/api/.env` | Porta da API (padrão: 3001) |
| `CORS_ORIGIN` | `apps/api/.env` | Origem permitida (padrão: http://localhost:3000) |

---

## Regras de Código

- **TypeScript strict** — sem `any`, sem retornos implícitos em funções async sem try/catch
- **Sempre use tipos de `@link-leagues/types`** — nunca redefina tipos localmente se já existem no pacote compartilhado
- **Sempre use utils de `@link-leagues/utils`** — verifique antes de criar nova função utilitária
- **Tratamento de erros nas rotas** — sempre envolva em `try/catch` e chame `next(err)` para delegar ao errorHandler
- **Tipos de input no body** — sempre faça cast de `req.body` para uma interface tipada (veja padrão em `ligas.ts`)
- **Soft delete** — recursos são arquivados setando `ativo: false`, não deletados (veja DELETE /ligas/:id)
- **Português** — todo texto de UI, labels, mensagens de erro e comentários do código em Português Brasileiro

---

## Módulos

| Módulo | Rota Frontend | Endpoint API | Descrição |
|--------|--------------|--------------|-----------|
| Ligas | `/ligas` | `/ligas` | Gestão de ligas acadêmicas |
| Projetos | `/projetos` | `/projetos` | Acompanhamento de projetos por liga |
| Presença | `/presenca` | `/presenca` | Controle de presença por evento |
| Progressão | `/dashboard` | — | Visão geral do progresso dos projetos |
| Salas | `/salas` | `/salas` | Agendamento e reservas de salas |

---

## Antes de Escrever Qualquer Código

1. Verifique `packages/types/src/` para tipos existentes antes de definir novos
2. Verifique `packages/utils/src/index.ts` para utilitários existentes antes de criar helpers
3. Verifique `packages/ui/src/` para componentes existentes antes de construir novos componentes base
4. Verifique os arquivos de rota em `apps/api/src/routes/` para o padrão estabelecido
5. Verifique as páginas em `apps/web/src/pages/` para o padrão de layout e componentes
6. Execute `npm run typecheck` após alterações para capturar problemas cedo
