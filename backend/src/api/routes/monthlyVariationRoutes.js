const { Router } = require('express');
const monthlyVariationController = require('../controllers/monthlyVariationController');
const authMiddleware = require('../middlewares/auth');

const routes = new Router();

routes.use(authMiddleware);

// Define a rota GET /api/monthly-variations
routes.get('/', monthlyVariationController.getAllMonthlyVariations);

module.exports = routes;
