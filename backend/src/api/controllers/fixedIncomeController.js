const FixedIncome = require('../../models/fixedIncome');

const fixedIncomeController = {
  // Handler para buscar todas as rendas fixas
  getAllFixedIncomes: async (req, res) => {
    try {
      const userId = req.user.id; // O ID do usuário vem do middleware de autenticação
      const fixedIncomes = await FixedIncome.getAllByUserId(userId);
      res.status(200).json(fixedIncomes);
    } catch (error) {
      console.error('Erro ao buscar rendas fixas:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao buscar as rendas fixas.' });
    }
  },

  // Outros handlers (create, update, delete) podem ser adicionados aqui
};

module.exports = fixedIncomeController;
