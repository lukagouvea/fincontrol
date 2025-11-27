import 'dotenv/config' // Necessário carregar manualmente agora
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // URLs agora são definidas aqui, não apenas no schema
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts', // Exemplo de script de seed
  },
})