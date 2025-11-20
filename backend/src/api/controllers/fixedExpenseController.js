const FixedExpense = require('../../models/fixedExpense');

const fixedExpenseController = {
  // Handler para buscar todas as despesas fixas
  getAllFixedExpenses: async (req, res) => {
    try {
      const userId = req.user.id; // O ID do usuário vem do middleware de autenticação
      const fixedExpenses = await FixedExpense.getAllByUserId(userId);
      res.status(200).json(fixedExpenses);
    } catch (error) {
      console.error('Erro ao buscar despesas fixas:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao buscar as despesas fixas.' });
    }
  },

  // Outros handlers (create, update, delete) podem ser adicionados aqui
};

module.exports = fixedExpenseController;
