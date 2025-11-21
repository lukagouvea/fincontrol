
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
      // Os dados agora vêm diretamente do body, não de um objeto aninhado.
      const newFixedIncome = await FixedIncome.create(userId, req.body);
      res.status(201).json(newFixedIncome);
    } catch (error) {
      console.error('Erro ao criar renda fixa:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao criar a renda fixa.' });
    }
  },

  // Handler para atualizar uma renda fixa
  updateFixedIncome: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updatedIncome = await FixedIncome.update(id, userId, req.body);
      if (!updatedIncome) {
        return res.status(404).json({ error: 'Renda fixa não encontrada ou não pertence ao usuário.' });
      }
      res.status(200).json(updatedIncome);
    } catch (error) {
      console.error('Erro ao atualizar renda fixa:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao atualizar a renda fixa.' });
    }
  },

  // Handler para deletar uma renda fixa
  deleteFixedIncome: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const success = await FixedIncome.remove(id, userId);
      if (!success) {
        return res.status(404).json({ error: 'Renda fixa não encontrada ou não pertence ao usuário.' });
      }
      res.status(204).send(); // Sem conteúdo
    } catch (error) {
      console.error('Erro ao deletar renda fixa:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao deletar a renda fixa.' });
    }
  }
};

module.exports = fixedIncomeController;
