const { Router } = require('express');
const variableExpenseController = require('../controllers/variableExpenseController');
const authMiddleware = require('../middlewares/auth');

const routes = new Router();

routes.use(authMiddleware);

// Rota para buscar todas as despesas variáveis (GET)
routes.get('/', variableExpenseController.getAllVariableExpenses);

// Rota para criar uma nova despesa variável (POST)
routes.post('/', variableExpenseController.createVariableExpense);

module.exports = routes;
