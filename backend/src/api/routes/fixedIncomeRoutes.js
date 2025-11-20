const { Router } = require('express');
const fixedIncomeController = require('../controllers/fixedIncomeController');
const authMiddleware = require('../middlewares/auth');

const routes = new Router();

// Todas as rotas de rendas fixas exigem autenticação
routes.use(authMiddleware);

// Rota para buscar todas as rendas fixas (GET)
routes.get('/', fixedIncomeController.getAllFixedIncomes);

// Rota para criar uma nova renda fixa (POST)
routes.post('/', fixedIncomeController.createFixedIncome);

// Outras rotas como PUT, DELETE serão adicionadas aqui

module.exports = routes;
