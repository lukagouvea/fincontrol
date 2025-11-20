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

  // Handler para criar uma nova despesa variável
  createVariableExpense: async (req, res) => {
    try {
      const userId = req.user.id;
      const expenseData = req.body; // Espera-se que venha em camelCase

      // Validação básica
      if (!expenseData.description || !expenseData.amount || !expenseData.expenseDate) {
        return res.status(400).json({ error: 'Descrição, valor e data são obrigatórios.' });
      }

      const newExpense = await VariableExpense.create(userId, expenseData);
      res.status(201).json(newExpense);
    } catch (error) {
      console.error('Erro ao criar despesa variável:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao criar a despesa variável.' });
    }
  },

};

module.exports = variableExpenseController;
