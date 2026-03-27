# Como iniciar o projeto

## Pré-requisitos

- Node.js 18+
- pnpm instalado (`npm install -g pnpm`)

## 1. Instalar dependências

```bash
pnpm install
```

## 2. Configurar variáveis de ambiente

### API (`apps/api/.env`)

Abra o arquivo e preencha as chaves do Supabase:

```
SUPABASE_URL=https://fascinatingmacaque-db.cloudfy.cloud
SUPABASE_ANON_KEY=<painel Supabase → Settings → API → anon public>
SUPABASE_SERVICE_ROLE_KEY=<painel Supabase → Settings → API → service_role>
API_PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### Frontend (`apps/web/.env.local`)

```
VITE_SUPABASE_URL=https://fascinatingmacaque-db.cloudfy.cloud
VITE_SUPABASE_ANON_KEY=<painel Supabase → Settings → API → anon public>
```

## 3. Iniciar o projeto

```bash
pnpm dev
```

Isso sobe frontend e API simultaneamente:

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |

## Comandos úteis

```bash
pnpm dev:web      # Apenas frontend
pnpm dev:api      # Apenas API
pnpm typecheck    # Verificar tipos TypeScript
pnpm build        # Build de produção
pnpm lint         # Lint
```

## Papéis de usuário

| Papel | Acesso |
|-------|--------|
| `staff` | Admin geral + Admin + Ligas + páginas comuns |
| `diretor` | Admin + Ligas + páginas comuns |
| `membro` | Ligas + páginas comuns |
| `aluno` | Páginas comuns apenas |

O papel é definido em `user_metadata.role` no painel Supabase → Authentication → Users.
