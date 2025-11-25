# Estágio Base
FROM node:22-alpine AS base
WORKDIR /app
# Instala openssl necessário para o Prisma
RUN apk -U upgrade && apk add --no-cache openssl

# Estágio de Dependências
FROM base AS deps
COPY package.json package-lock.json ./
# Instala todas as dependências (incluindo dev para compilar TS)
RUN npm ci

# Estágio de Desenvolvimento (Hot Reload)
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Gera o cliente prisma antes de iniciar
CMD ["sh", "-c", "npx prisma generate && npm run dev"]

# Estágio de Build (Produção)
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# Remove devDependencies para deixar a imagem leve
RUN npm prune --production

# Estágio Final (Produção)
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma.config.ts ./
# Copia o schema prisma se precisar rodar migrações em produção
COPY --from=builder /app/prisma ./prisma 

EXPOSE 3001
CMD ["npm", "run", "start"]