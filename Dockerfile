FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.4
WORKDIR /app

# Instala dependências com cache eficiente
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# Build
FROM deps AS builder
COPY tsconfig.base.json ./
COPY packages/types/src ./packages/types/src
COPY packages/utils/src ./packages/utils/src
COPY apps/api/ ./apps/api/
RUN pnpm --filter @link-leagues/api build

# Imagem final enxuta
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9.15.4
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
