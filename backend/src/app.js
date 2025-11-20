const express = require('express');
const cors = require('cors');
const userRoutes = require('./api/routes/userRoutes');
const categoryRoutes = require('./api/routes/categoryRoutes');
const fixedIncomeRoutes = require('./api/routes/fixedIncomeRoutes');
const fixedExpenseRoutes = require('./api/routes/fixedExpenseRoutes');
const monthlyVariationRoutes = require('./api/routes/monthlyVariationRoutes');
const variableIncomeRoutes = require('./api/routes/variableIncomeRoutes'); // Adicionado
const variableExpenseRoutes = require('./api/routes/variableExpenseRoutes'); // Adicionado
const reportRoutes = require('./api/routes/reportRoutes');

class App {
  constructor() {
    this.server = express();

    this.middlewares();
    this.routes();
  }

  middlewares() {
    this.server.use(express.json());
    this.server.use(cors());
  }

  routes() {
    this.server.use('/api/users', userRoutes);
    this.server.use('/api/categories', categoryRoutes);
    this.server.use('/api/fixed-incomes', fixedIncomeRoutes);
    this.server.use('/api/fixed-expenses', fixedExpenseRoutes);
    this.server.use('/api/monthly-variations', monthlyVariationRoutes);
    this.server.use('/api/variable-incomes', variableIncomeRoutes); // Adicionado
    this.server.use('/api/variable-expenses', variableExpenseRoutes); // Adicionado
    this.server.use('/api/reports', reportRoutes);
  }
}

module.exports = new App().server;
