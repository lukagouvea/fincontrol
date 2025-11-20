const MonthlyVariation = require('../../models/monthlyVariation');

const monthlyVariationController = {
  // Handler para buscar todas as variações mensais
  getAllMonthlyVariations: async (req, res) => {
    try {
      const userId = req.user.id;
      const monthlyVariations = await MonthlyVariation.getAllByUserId(userId);
      res.status(200).json(monthlyVariations);
    } catch (error) {
      console.error('Erro ao buscar variações mensais:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao buscar as variações mensais.' });
    }
  },

  // Outros handlers podem ser adicionados aqui
};

module.exports = monthlyVariationController;
