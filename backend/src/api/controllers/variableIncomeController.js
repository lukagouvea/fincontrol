const VariableIncome = require('../../models/variableIncome');

const variableIncomeController = {
  // Handler para buscar todas as rendas variáveis
  getAllVariableIncomes: async (req, res) => {
    try {
      const userId = req.user.id;
      const incomes = await VariableIncome.getAllByUserId(userId);
      res.status(200).json(incomes);
    } catch (error) {
      console.error('Erro ao buscar rendas variáveis:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao buscar as rendas variáveis.' });
    }
  },

  // Handler para criar uma nova renda variável
  createVariableIncome: async (req, res) => {
    try {
      const userId = req.user.id;
      const incomeData = req.body; // Espera-se que venha em camelCase

      if (!incomeData.description || !incomeData.amount || !incomeData.receptionDate) {
          return res.status(400).json({ error: 'Descrição, valor e data são obrigatórios.' });
      }

      const newIncome = await VariableIncome.create(userId, incomeData);
      res.status(201).json(newIncome);
    } catch (error) {
      console.error('Erro ao criar renda variável:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao criar a renda variável.' });
    }
  },
  
};

module.exports = variableIncomeController;
