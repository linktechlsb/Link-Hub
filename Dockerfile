# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app

# Copiar todos os arquivos
COPY . .

# Instalar dependencias
RUN npm install

# Limpar cache do npm
RUN npm cache clean --force

# Build de todos os pacotes
RUN npm run build

# Criar .env vazio para o tsx nao falhar ao iniciar
# (env vars reais sao passadas via docker run --env-file ou -e)
RUN touch .env

EXPOSE 3000 3001

CMD ["npm", "run", "dev"]
