const { Router } = require('express');
const fixedExpenseController = require('../controllers/fixedExpenseController');
const authMiddleware = require('../middlewares/auth');

const routes = new Router();

// Todas as rotas de despesas fixas exigem autenticação
routes.use(authMiddleware);

// Rota para buscar todas as despesas fixas (GET)
routes.get('/', fixedExpenseController.getAllFixedExpenses);

// Rota para criar uma nova despesa fixa (POST)
routes.post('/', fixedExpenseController.createFixedExpense);


module.exports = routes;
