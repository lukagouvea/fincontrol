const express = require('express');
const cors = require('cors');
const userRoutes = require('./api/routes/userRoutes');
const categoryRoutes = require('./api/routes/categoryRoutes');
// const transactionRoutes = require('./api/routes/transactionRoutes'); // Removido
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
    // this.server.use('/api/transactions', transactionRoutes); // Removido
    this.server.use('/api/reports', reportRoutes);
  }
}

module.exports = new App().server;
