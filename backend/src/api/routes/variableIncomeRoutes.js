const { Router } = require('express');
const variableIncomeController = require('../controllers/variableIncomeController');
const authMiddleware = require('../middlewares/auth');

const routes = new Router();

routes.use(authMiddleware);

// Rota para buscar todas as rendas variáveis (GET)
routes.get('/', variableIncomeController.getAllVariableIncomes);

// Rota para criar uma nova renda variável (POST)
routes.post('/', variableIncomeController.createVariableIncome);

module.exports = routes;
