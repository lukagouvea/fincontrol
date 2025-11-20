const { Router } = require('express');
const variableIncomeController = require('../controllers/variableIncomeController');
const authMiddleware = require('../middlewares/auth');

const routes = new Router();

routes.use(authMiddleware);

// Define a rota GET /api/variable-incomes
routes.get('/', variableIncomeController.getAllVariableIncomes);

module.exports = routes;
