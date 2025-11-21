const FixedIncome = require('../../models/fixedIncome');

const fixedIncomeController = {
  // Handler para buscar todas as rendas fixas
  getAllFixedIncomes: async (req, res) => {
    try {
      const userId = req.user.id;
      const fixedIncomes = await FixedIncome.getAllByUserId(userId);
      res.status(200).json(fixedIncomes);
    } catch (error) {
      console.error('Erro ao buscar rendas fixas:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao buscar as rendas fixas.' });
    }
  },

  // Handler para criar uma nova renda fixa
  createFixedIncome: async (req, res) => {
    try {
      const userId = req.user.id;
      const incomeData = { ...req.body, userId }; // Adiciona o userId aos dados
      const newFixedIncome = await FixedIncome.create(incomeData);
      res.status(201).json(newFixedIncome);
    } catch (error) {
      console.error('Erro ao criar renda fixa:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao criar a renda fixa.' });
    }
  },

  // Outros handlers (update, delete) podem ser adicionados aqui
};

module.exports = fixedIncomeController;
