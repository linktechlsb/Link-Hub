# ---- Base ----
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.4
WORKDIR /app

# ---- Dependências ----
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/types/package.json   ./packages/types/
COPY packages/utils/package.json   ./packages/utils/
COPY packages/ui/package.json      ./packages/ui/
COPY apps/api/package.json         ./apps/api/
COPY apps/web/package.json         ./apps/web/
RUN pnpm install --frozen-lockfile

# ---- Build Web ----
FROM deps AS web-builder
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL
COPY tsconfig.base.json ./
COPY packages/types/src  ./packages/types/src
COPY packages/utils/src  ./packages/utils/src
COPY packages/ui/        ./packages/ui/
COPY apps/web/           ./apps/web/
RUN pnpm --filter @link-leagues/web build

# ---- Runtime (API + Web dist) ----
FROM deps AS runner
COPY tsconfig.base.json ./
COPY packages/types/src  ./packages/types/src
COPY packages/utils/src  ./packages/utils/src
COPY packages/ui/        ./packages/ui/
COPY apps/api/           ./apps/api/
RUN pnpm --filter @link-leagues/api build
COPY --from=web-builder /app/apps/web/dist ./apps/web/dist

EXPOSE ${PORT:-3001}
CMD ["node", "apps/api/dist/index.js"]
