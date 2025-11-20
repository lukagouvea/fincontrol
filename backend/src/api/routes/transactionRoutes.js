const { Router } = require('express');
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middlewares/auth');

const routes = new Router();

// Todas as rotas de transação exigem autenticação
routes.use(authMiddleware);

routes.get('/', transactionController.getAllTransactions);
routes.get('/:id', transactionController.getTransactionById);
routes.post('/', transactionController.createTransaction);
routes.put('/:id', transactionController.updateTransaction);
routes.delete('/:id', transactionController.deleteTransaction);

module.exports = routes;
