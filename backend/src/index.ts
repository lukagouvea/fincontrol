import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';

// Import das rotas
import authRoute from './routes/auth.js';
import categoriesRoute from './routes/categories.js';
import transactionsRoute from './routes/transactions.js';
import recurringRoute from './routes/recurring.js';
import investmentRoute from './routes/investment.js';

const app = new Hono();

// --- CONFIGURAÇÃO CORS ROBUSTA ---
app.use('/*', cors({
  origin: process.env.FRONTEND_URL!, // TEM que ser idêntico ao que está no browser (sem barra no final)
  credentials: true, // Permite Cookies
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'], // 'Cookie' é vital aqui
  exposeHeaders: ['Content-Length'],
  maxAge: 600, // Cache do preflight por 10 minutos
}));

app.get('/', (c) => c.text('API FinControl rodando 🚀'));

// Registro das Rotas
app.route('/auth', authRoute);
app.route('/categories', categoriesRoute);
app.route('/transactions', transactionsRoute);
app.route('/recurring', recurringRoute);
app.route('/investment', investmentRoute);

serve({
  fetch: app.fetch,
  port: parseInt(process.env.PORT!) || 3001, // Mantendo 3001 para não conflitar com o React
  hostname: '0.0.0.0',
});

console.log('🔥 Servidor rodando em ' + process.env.PORT);