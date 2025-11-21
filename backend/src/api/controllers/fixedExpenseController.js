const FixedExpense = require('../../models/fixedExpense');

const fixedExpenseController = {
  // Handler para buscar todas as despesas fixas
  getAllFixedExpenses: async (req, res) => {
    try {
      const userId = req.user.id;
      const fixedExpenses = await FixedExpense.getAllByUserId(userId);
      res.status(200).json(fixedExpenses);
    } catch (error) {
      console.error('Erro ao buscar despesas fixas:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao buscar as despesas fixas.' });
    }
  },

  // Handler para criar uma nova despesa fixa
  createFixedExpense: async (req, res) => {
    try {
      const userId = req.user.id;
      const expenseData = { ...req.body, userId }; // Adiciona o userId aos dados

      // Validação básica
      if (!expenseData.description || !expenseData.amount || !expenseData.startDate || !expenseData.day) {
        return res.status(400).json({ error: 'Descrição, valor, data de início e dia de recorrência são obrigatórios.' });
      }

      const newExpense = await FixedExpense.create(expenseData);
      res.status(201).json(newExpense);
    } catch (error) {
      console.error('Erro ao criar despesa fixa:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao criar a despesa fixa.' });
    }
  },

};

module.exports = fixedExpenseController;
