# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app

# Copiar todos os arquivos
COPY . .

# Instalar dependencias
RUN npm install

# Limpar cache do npm
RUN npm cache clean --force

# Variáveis de buildtime para Vite (web)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build de todos os pacotes
RUN npm run build

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
