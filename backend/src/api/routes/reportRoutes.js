const { Router } = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/auth');

const routes = new Router();

routes.use(authMiddleware);

routes.get('/monthly', reportController.getMonthlyReport);

module.exports = routes;
