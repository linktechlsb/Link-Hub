# Link Leagues Platform

Plataforma centralizada para gerenciamento das ligas acadêmicas da **Link — Faculdade de Negócios**.

## Stack

| Camada         | Tecnologia                        |
| -------------- | --------------------------------- |
| Frontend       | React 18.3 + TypeScript + Vite    |
| Estilização    | Tailwind CSS v3 + shadcn/ui       |
| Roteamento     | React Router v6                   |
| Backend        | Node.js 20 + Express + TypeScript |
| Banco de Dados | PostgreSQL via Supabase           |
| Autenticação   | Supabase Auth + JWT               |
| Monorepo       | npm workspaces                    |
| Lint / Format  | ESLint 9 + Prettier 3             |
| Deploy         | Railway (container único)         |

## Estrutura

```
link-leagues-platform/
├── apps/
│   ├── web/            # Frontend React + Vite   :3000 (dev)
│   └── api/            # Backend Express         :3001 (dev) — serve web/dist em produção
├── packages/
│   ├── types/          # Tipos TypeScript compartilhados
│   ├── utils/          # Funções puras compartilhadas
│   └── ui/             # Componentes base compartilhados
├── migrations/         # SQL migrations numeradas (001_*, 002_*, …)
├── docs/               # Specs e planos (docs/superpowers/)
├── scripts/            # Scripts utilitários
├── Dockerfile          # Build multi-stage para Railway
└── railway.json        # Configuração de deploy (um serviço, healthcheck, Dockerfile)
```

## Pré-requisitos

- **Node.js ≥ 20** (fixado em `package.json#engines`)
- **npm ≥ 10** (vem com Node 20+)
- Conta Supabase com o projeto criado e as migrations de [`migrations/`](migrations/) aplicadas

## Primeiros passos

```bash
# Clonar e instalar
git clone <repo-url>
cd link-leagues-platform
npm install
```

### Variáveis de ambiente

Copie `.env.example` e preencha com suas credenciais:

```bash
cp .env.example .env
```

Variáveis obrigatórias (validadas com Zod no boot da API via [`apps/api/src/config/env.ts`](apps/api/src/config/env.ts)):

| Variável                    | Onde é usada | Descrição                                          |
| --------------------------- | ------------ | -------------------------------------------------- |
| `SUPABASE_URL`              | API          | URL do projeto Supabase                            |
| `SUPABASE_ANON_KEY`         | API          | Chave anon (só validação de token)                 |
| `SUPABASE_SERVICE_ROLE_KEY` | API          | Service role (nunca expor ao frontend)             |
| `VITE_SUPABASE_URL`         | Web          | URL do projeto Supabase (buildtime)                |
| `VITE_SUPABASE_ANON_KEY`    | Web          | Chave anon (buildtime, embutida no bundle)         |
| `CORS_ORIGIN`               | API          | Origem permitida (padrão `http://localhost:3000`)  |
| `APP_URL`                   | API          | URL pública do front (usada em e-mails)            |
| `PORT`                      | API          | Porta do servidor (Railway injeta automaticamente) |

## Scripts

```bash
npm run dev           # Frontend + API simultaneamente
npm run dev:web       # Apenas frontend (Vite, :3000)
npm run dev:api       # Apenas API (tsx watch, :3001)
npm run build         # Build de ambos (API primeiro, depois web)
npm run typecheck     # TypeScript em ambos
npm run lint          # ESLint em todo o monorepo
npm run lint:fix      # ESLint com auto-fix
npm run format        # Prettier --write em todo o repo
npm run format:check  # Prettier --check (usado no CI)
npm run clean         # Remove dist/ e node_modules/
```

## Qualidade de código

Este repositório tem guardrails ativos:

- **ESLint 9** (flat config em [`eslint.config.mjs`](eslint.config.mjs)) cobrindo `apps/*` e `packages/*`.
- **Prettier 3** (config em [`.prettierrc.json`](.prettierrc.json)) para formatação consistente.
- **EditorConfig** para consistência entre editores.
- **Husky + lint-staged** no pre-commit — arquivos alterados passam por `eslint --fix` + `prettier --write` automaticamente.
- **GitHub Actions** (em [`.github/workflows/ci.yml`](.github/workflows/ci.yml)) executa em todo push/PR: `format:check`, `lint`, `typecheck`, `build`.

## Módulos

| Módulo      | Rota Frontend    | Endpoint API    |
| ----------- | ---------------- | --------------- |
| Ligas       | `/ligas`         | `/api/ligas`    |
| Projetos    | `/projetos`      | `/api/projetos` |
| Presença    | `/presenca`      | `/api/presenca` |
| Agenda      | `/agenda`        | `/api/eventos`  |
| Salas       | `/salas`         | `/api/salas`    |
| Recursos    | `/gerenciamento` | `/api/recursos` |
| Receitas    | `/gerenciamento` | `/api/receitas` |
| Super Admin | `/super-admin`   | `/api/usuarios` |

## Identidade visual

| Token          | Cor       | Uso                                             |
| -------------- | --------- | ----------------------------------------------- |
| `navy`         | `#10284E` | Principal — sidebar, botões primários, headings |
| `link-blue`    | `#546484` | Secundário — elementos de suporte               |
| `brand-yellow` | `#FEC641` | Apoio — destaques e alertas                     |
| `brand-gray`   | `#EAEAEA` | Neutro — bordas e fundos suaves                 |

Tipografia: **Aeonik** (display, headings) · **Montserrat** (corpo).

## Papéis

| Papel       | Permissões                                         |
| ----------- | -------------------------------------------------- |
| `staff`     | Total — ligas, projetos, presença, salas, usuários |
| `diretor`   | Liga própria — gerenciar projetos, presença, salas |
| `professor` | Aprovações de projetos da sua liga                 |
| `membro`    | Leitura — projetos e presença da própria liga      |

Papéis ficam em `user_metadata.role` no Supabase e são expostos via middleware `authenticate` em [`apps/api/src/middleware/auth.ts`](apps/api/src/middleware/auth.ts).

## Deploy (Railway — single service)

O projeto é deployado como **um container único** no Railway:

1. A API serve `/api/*` e também os estáticos do build do Vite (`apps/web/dist/*`).
2. O Dockerfile na raiz faz build multi-stage (builder + runtime) e copia só os artefatos necessários.
3. `railway.json` fixa um serviço único, healthcheck em `/api/health`, restart on failure.

**Configuração necessária no Railway:**

- Root Directory: `/`
- Variables (marcar as `VITE_*` como **build-time**):
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `APP_URL`, `CORS_ORIGIN`
- **Não setar** `PORT` — Railway injeta automaticamente.

## Documentação

Veja [`CLAUDE.md`](CLAUDE.md) para convenções arquiteturais detalhadas (onde colocar cada coisa, padrões de route handler, tokens semânticos do design system, regras de código).

Specs e planos ficam em [`docs/superpowers/`](docs/superpowers/).
