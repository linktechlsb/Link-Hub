# Link Leagues Platform

Plataforma centralizada para gerenciamento das ligas acadêmicas da **Link — Faculdade de Negócios**.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18.3 + TypeScript + Vite |
| Estilização | Tailwind CSS + shadcn/ui |
| Roteamento | React Router v6 |
| Backend | Node.js + Express + TypeScript |
| Banco de Dados | PostgreSQL via Supabase |
| Autenticação | Supabase Auth + JWT |
| Monorepo | pnpm workspaces + Turborepo |

## Estrutura

```
link-leagues-platform/
├── apps/
│   ├── web/          # Frontend (React + Vite)  :3000
│   └── api/          # Backend (Express)         :3001
└── packages/
    ├── types/        # Tipos TypeScript compartilhados
    ├── utils/        # Utilitários comuns
    └── ui/           # Componentes base (sobre shadcn/ui)
```

## Primeiros passos

### Pré-requisitos

- Node.js >= 20
- pnpm >= 9

### Instalação

```bash
# Instalar pnpm (caso não tenha)
npm install -g pnpm

# Instalar dependências
pnpm install
```

### Variáveis de ambiente

```bash
cp .env.example apps/web/.env.local
cp .env.example apps/api/.env
# Edite os arquivos com suas credenciais do Supabase
```

### Desenvolvimento

```bash
# Rodar frontend e API simultaneamente
pnpm dev

# Rodar apenas o frontend
pnpm dev:web

# Rodar apenas a API
pnpm dev:api
```

### Build

```bash
pnpm build
```

## Módulos

| Módulo | Rota Frontend | Endpoint API | Prioridade |
|--------|--------------|--------------|------------|
| Gestão de Ligas | `/ligas` | `/ligas` | Alta |
| Gestão de Projetos | `/projetos` | `/projetos` | Alta |
| Controle de Presença | `/presenca` | `/presenca` | Alta |
| Progressão de Projetos | `/dashboard` | — | Alta |
| Agendamento de Salas | `/salas` | `/salas` | Média |

## Identidade Visual

| Token | Cor | Uso |
|-------|-----|-----|
| `navy` | `#10284E` | Principal — fundos, botões primários |
| `link-blue` | `#546484` | Principal — elementos secundários |
| `brand-yellow` | `#FEC641` | Apoio — destaques e alertas |
| `brand-gray` | `#EAEAEA` | Apoio — bordas e fundos neutros |

Tipografia: **Aeonik** (display) · **Montserrat** (sistema)

## Papéis

| Papel | Acesso |
|-------|--------|
| `admin` | Total — ligas, projetos, presença, salas e usuários |
| `lider` | Própria liga — projetos, presença e salas |
| `membro` | Leitura — projetos e presença da própria liga |
