const { Router } = require('express');
const variableExpenseController = require('../controllers/variableExpenseController');
const authMiddleware = require('../middlewares/auth');

const routes = new Router();

routes.use(authMiddleware);

// Define a rota GET /api/variable-expenses
routes.get('/', variableExpenseController.getAllVariableExpenses);

module.exports = routes;
