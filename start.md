# Como iniciar o projeto

## Pré-requisitos

- Node.js 18+

## 1. Instalar dependências

```bash
npm install
```

## 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo e preencha as chaves:

```bash
cp .env.example .env
```

Depois, abra o arquivo `.env` na **raiz do projeto** e preencha todas as variáveis:

```
# Supabase
SUPABASE_URL=https://fascinatingmacaque-db.cloudfy.cloud
SUPABASE_ANON_KEY=<painel Supabase → Settings → API → anon public>
SUPABASE_SERVICE_ROLE_KEY=<painel Supabase → Settings → API → service_role>
DATABASE_URL=<painel Supabase → Settings → Database → Connection string>

# API
API_PORT=3001
CORS_ORIGIN=http://localhost:3000

# Frontend (Vite)
VITE_SUPABASE_URL=https://fascinatingmacaque-db.cloudfy.cloud
VITE_SUPABASE_ANON_KEY=<painel Supabase → Settings → API → anon public>
```

**Importante:** O arquivo `.env` deve estar na **raiz do projeto**, não dentro de nenhuma pasta.

## 3. Iniciar o projeto

```bash
npm run dev
```

Isso sobe frontend e API simultaneamente:

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |

## Comandos úteis

```bash
npm run dev:web      # Apenas frontend
npm run dev:api      # Apenas API
npm run typecheck    # Verificar tipos TypeScript
npm run build        # Build de produção
npm run lint         # Lint
```

## Papéis de usuário

| Papel | Acesso |
|-------|--------|
| `staff` | Admin geral + Admin + Ligas + páginas comuns |
| `diretor` | Admin + Ligas + páginas comuns |
| `membro` | Ligas + páginas comuns |
| `aluno` | Páginas comuns apenas |

O papel é definido em `user_metadata.role` no painel Supabase → Authentication → Users.
