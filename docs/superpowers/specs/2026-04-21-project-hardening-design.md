# Link Leagues Platform — Project Hardening Spec

**Data:** 2026-04-21
**Branch de trabalho:** `develop/chore`
**Status:** aprovado, em execução pela Fase 1

---

## Contexto

O projeto é um monorepo npm workspaces (`apps/web` + `apps/api` + `packages/*`)
cobrindo a gestão de ligas acadêmicas da Link. Uma auditoria completa
identificou uma série de problemas que impedem o projeto de ser tratado
como produção confiável:

- Deploy em Railway criando dois serviços quando deveria ser um só
  _(já corrigido via `railway.json` + Dockerfile multi-stage)_
- Cinco componentes de frontend entre 874 e 1.512 linhas
- Tipos duplicados inline nos componentes, ignorando `packages/types`
- Sem ESLint, sem Prettier, sem CI, sem testes
- API sem validação de input (Zod/Joi), sem logger estruturado, vazando
  stack de erro em produção
- `console.*` espalhado na API e na web
- Cache de sessão de autenticação manual e sem invalidação
- Cliente de API no frontend é `fetch()` cru por página, sem cache
- Numeração de migrations quebrada (dois arquivos `007_*`)
- README.md contradiz CLAUDE.md (diz pnpm/Turborepo, é npm workspaces)

## Objetivos

1. Código **sólido o suficiente pra deploy em produção**, sem gambiarra.
2. Ferramentas que **impeçam** regressões (lint/format/CI) antes de
   começar qualquer refatoração.
3. Quebrar os arquivos monstruosos em unidades compreensíveis (<250
   linhas cada).
4. Padronizar acesso de dados (TanStack Query no front, validação Zod na
   API, logger estruturado).
5. Deploy único em Railway, reprodutível.

## Não-objetivos

- Reescrever regras de negócio — só reorganiza.
- Trocar banco, provedor de auth, ou stack UI (Tailwind + shadcn ficam).
- Cobertura de teste 100% — foco em infra de teste + smoke tests de
  auth e 1 rota por módulo.
- Internacionalização (PT-BR permanece única língua de UI).

---

## Arquitetura alvo

### Backend (`apps/api`)

```
src/
├── config/            env.ts (Zod), supabase.ts, logger.ts
├── middleware/        auth.ts, requireRole.ts, validate.ts, errorHandler.ts
├── lib/               helpers puros (sem Express)
├── modules/           um diretório por domínio (ligas, projetos, ...)
│   └── ligas/
│       ├── schemas.ts       # Zod request/response
│       ├── service.ts       # lógica de negócio (chama Supabase)
│       └── routes.ts        # handlers finos, delegam pro service
├── routes/index.ts    montagem do router raiz
└── index.ts           bootstrap
```

### Frontend (`apps/web`)

```
src/
├── app/               providers (QueryClient, Router, Theme)
├── lib/
│   ├── api/           client() wrapper + tipos compartilhados
│   ├── queries/       hooks TanStack (useLigas, useProjetos, …)
│   └── supabase.ts    client (apenas auth)
├── components/        base + feature components
├── features/          código por domínio (ligas/, projetos/, …)
│   └── gerenciamento/
│       ├── tabs/      MembrosTab.tsx, RecursosTab.tsx, …
│       ├── hooks/     useMembros.ts, useRecursos.ts, …
│       └── GerenciamentoPage.tsx  (orquestrador fino)
├── layouts/
├── router/
└── main.tsx
```

### Packages compartilhados

- `@link-leagues/types` — **único lugar** pra interfaces de domínio.
- `@link-leagues/utils` — só funções puras.
- `@link-leagues/ui` — promover só quando um componente for usado
  em 2+ apps. Se ficar vazio, apagar.

---

## Fases

### **Fase 1 — Fundação** (alvo desta execução)

Tudo nesta fase é **aditivo e não-destrutivo**. Não muda comportamento
de runtime, só cria as barreiras de qualidade.

#### 1.1 Lint + Format

- ESLint 9 flat config na raiz (`eslint.config.js`):
  - `@typescript-eslint/recommended-type-checked`
  - `eslint-plugin-react`, `eslint-plugin-react-hooks`
  - `eslint-plugin-import` (ordem + cycle detection)
- Prettier 3 com `.prettierrc` + `.prettierignore`.
- `.editorconfig` na raiz.
- Scripts raiz: `lint`, `lint:fix`, `format`, `format:check` rodando em
  `apps/**` e `packages/**`.

#### 1.2 Hooks de pre-commit

- Husky 9 + lint-staged:
  - `*.{ts,tsx}` → `eslint --fix` + `prettier --write`
  - `*.{json,md,yml}` → `prettier --write`
- Pre-push opcional: `npm run typecheck`.

#### 1.3 CI no GitHub Actions

- `.github/workflows/ci.yml`:
  - Matriz single: Node 20.
  - Jobs: `lint`, `typecheck`, `build`.
  - Cache de `node_modules` via `actions/setup-node` com `cache: npm`.
  - Rodando em `push` e `pull_request`.

#### 1.4 Validação de env vars na API

- `apps/api/src/config/env.ts`:
  - Zod schema (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
    `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN` opcional, `PORT`
    opcional).
  - Falha no boot com mensagem clara se faltar.
- Substituir acessos `process.env[...]` no código pelo `env` tipado.

#### 1.5 Migrations

- Renomear `migrations/007_receitas.sql` → `008_receitas.sql` (se
  `008` não existir) ou para próximo número livre.
- Ajustar quaisquer referências em documentação.
- **Não** re-executa migrations — só renumera arquivo.

#### 1.6 README.md

- Reescrever alinhado ao CLAUDE.md: npm workspaces, scripts corretos,
  requisitos (Node 20+), links para `.env.example`, instruções de
  deploy Railway (nova seção).

#### 1.7 Framework de teste

- Vitest 2 instalado em `apps/api` e `apps/web` com configs mínimas.
- `@testing-library/react` + `jsdom` no web.
- Scripts `test` e `test:watch` nos dois apps + raiz.
- **Sem escrever testes ainda** — só deixar pronto. Testes vêm na Fase 2.

#### Critérios de aceite da Fase 1

- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run format:check`
  rodam em verde na raiz.
- CI executa os 4 acima em PR.
- `git commit` falha se o código não passar no lint-staged.
- `node apps/api/dist/index.js` com env vars faltando → falha no boot
  com erro descritivo do Zod.
- `npm run test` executa (zero testes, mas zero erros).

---

### **Fase 2 — Arquitetura** (próxima iteração)

1. **API client central + TanStack Query** no front.
   - `apps/web/src/lib/api/client.ts` — `fetch` wrapper com:
     injeção do JWT do Supabase, erro tipado, base URL via `VITE_API_URL`.
   - `QueryClientProvider` em `app/providers.tsx`.
   - Hooks por domínio em `lib/queries/`.
2. **Migrar tipos inline** — grep em `apps/web/src/pages/` por
   `interface|type ... =`; mover tudo de domínio pra `packages/types`.
3. **Zod nas rotas da API**:
   - Middleware `validate({ body, params, query })` em `middleware/`.
   - Schemas por rota em `modules/<dominio>/schemas.ts`.
4. **Reorganização em `modules/`**:
   - Mover cada `routes/<dominio>.ts` pra `modules/<dominio>/{routes,service,schemas}.ts`.
   - Handlers viram finos, service contém a lógica Supabase.
5. **Quebrar os 5 componentes gigantes**:
   - Extrair cada tab em subcomponente (`<MembrosTab/>`, `<ReceitasTab/>` …).
   - Extrair estado de dados pra hooks TanStack Query.
   - Alvo: nenhum `.tsx` > 250 linhas.
6. **Logger estruturado** (`pino`) na API substituindo `console.*`.
   - `errorHandler` loga via pino, nunca retorna stack em prod.
7. **Auth middleware** — remover cache caseiro, confiar no Supabase
   por request; ou expor invalidação no logout.

#### Critérios de aceite da Fase 2

- Nenhum `.tsx` > 250 linhas no `apps/web/src`.
- Zero `interface` de domínio fora de `packages/types`.
- Toda rota de API tem Zod schema validando body/params.
- Zero `console.log`/`console.error` em `apps/api/src` ou
  `apps/web/src` (exceções documentadas).
- Smoke tests: 1 teste de auth middleware + 1 teste por módulo (GET
  happy path) passando.

---

### **Fase 3 — Operação**

1. CI expandido: `test` + `docker build` step, matriz com Node 20 e 22.
2. Auditoria de deps (`npm audit` no CI).
3. Dependabot/Renovate para atualização automática.
4. `packages/ui` — popular com componentes reais ou remover.
5. Limpar branches remotos mortos.
6. Sentry (ou equivalente) para error tracking em produção.
7. Rate limiting na API (`express-rate-limit`).

---

## Riscos e mitigação

| Risco                                          | Mitigação                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Lint-staged quebrando commits existentes       | Rodar `npm run format` + `npm run lint:fix` em um commit isolado antes de ativar os hooks |
| CI falhando por drift entre local e GitHub     | Usar Node 20 em ambos, `engines` já fixado                                                |
| Env validation quebrando dev local             | Documentar exatamente quais vars são obrigatórias; `.env.example` completo                |
| Refatoração de 900-linhas introduzir regressão | Trabalhar página por página, testar manualmente cada aba após extração                    |
| Renumeração de migration quebrar deploy        | Verificar que nenhuma migration já aplicada no Supabase referencia o nome antigo          |

---

## Ordem de merge

- Fase 1 inteira num único PR (`chore: foundation — lint, format, CI, env, tests setup`).
- Fase 2 dividida por área (api / web / packages) em PRs separados.
- Fase 3 iterativa, um PR por item.
