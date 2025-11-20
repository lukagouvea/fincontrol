const VariableExpense = require('../../models/variableExpense');

const variableExpenseController = {
  // Handler para buscar todas as despesas variáveis
  getAllVariableExpenses: async (req, res) => {
    try {
      const userId = req.user.id;
      const expenses = await VariableExpense.getAllByUserId(userId);
      res.status(200).json(expenses);
    } catch (error) {
      console.error('Erro ao buscar despesas variáveis:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao buscar as despesas variáveis.' });
    }
  },
};

module.exports = variableExpenseController;
