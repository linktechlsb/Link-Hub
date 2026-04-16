FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.4
WORKDIR /app

# Instala dependências
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# Build — variáveis VITE_ precisam ser ARG para o Vite bake-las no bundle
FROM deps AS builder
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL

COPY tsconfig.base.json ./
COPY packages/types/src ./packages/types/src
COPY packages/utils/src ./packages/utils/src
COPY packages/ui/ ./packages/ui/
COPY apps/web/ ./apps/web/
RUN pnpm --filter @link-leagues/web build

# Serve com nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
