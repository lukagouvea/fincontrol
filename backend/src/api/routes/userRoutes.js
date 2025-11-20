const { Router } = require('express');
const userController = require('../controllers/userController');

const routes = new Router();

routes.post('/signup', userController.signup);
routes.post('/login', userController.login);

module.exports = routes;
