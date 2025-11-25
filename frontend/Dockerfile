# Estágio Base
FROM node:22-alpine AS base
WORKDIR /app

# Estágio de Dependências
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Estágio de Desenvolvimento (Com Vite)
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# Estágio de Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Argumento de build para injetar a URL do backend
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Estágio de Produção (Nginx)
FROM nginx:alpine AS runner
# Copia o build do React para a pasta do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html
COPY 50x.html /usr/share/nginx/html/50x.html
# Configuração customizada do Nginx (opcional, mas recomendada para React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]