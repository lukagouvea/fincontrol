const { Router } = require('express');
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middlewares/auth');

const routes = new Router();

// Todas as rotas de categoria exigem autenticação
routes.use(authMiddleware);

routes.get('/', categoryController.getAllCategories);
routes.post('/', categoryController.createCategory);
routes.put('/:id', categoryController.updateCategory);
routes.delete('/:id', categoryController.deleteCategory);
routes.get('/:id', categoryController.getCategoryById);


module.exports = routes;
