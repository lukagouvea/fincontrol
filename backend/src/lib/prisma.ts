import { PrismaClient } from '../generated/client.js'; // Note o caminho explícito se necessário
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';


// Cria o adaptador primeiro
const adapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_URL! 
});

// Passa o adaptador para o cliente
export const prisma = new PrismaClient({ adapter });