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
};

module.exports = variableIncomeController;
