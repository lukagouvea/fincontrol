const { Router } = require('express');
const fixedIncomeController = require('../controllers/fixedIncomeController');
const authMiddleware = require('../middlewares/auth');

const routes = new Router();

// Todas as rotas de rendas fixas exigem autenticação
routes.use(authMiddleware);

// Define a rota GET /api/fixed-incomes
routes.get('/', fixedIncomeController.getAllFixedIncomes);

// Outras rotas como POST, PUT, DELETE serão adicionadas aqui

module.exports = routes;
