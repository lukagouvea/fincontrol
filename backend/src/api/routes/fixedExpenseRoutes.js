const { Router } = require('express');
const fixedExpenseController = require('../controllers/fixedExpenseController');
const authMiddleware = require('../middlewares/auth');

const routes = new Router();

// Todas as rotas de despesas fixas exigem autenticação
routes.use(authMiddleware);

// Define a rota GET /api/fixed-expenses
routes.get('/', fixedExpenseController.getAllFixedExpenses);

// Outras rotas como POST, PUT, DELETE serão adicionadas aqui

module.exports = routes;
