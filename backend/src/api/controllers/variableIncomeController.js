
const VariableIncome = require('../../models/variableIncome');

const variableIncomeController = {
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

  createVariableIncome: async (req, res) => {
    try {
      const userId = req.user.id;
      if (!req.body.description || !req.body.amount || !req.body.income_date) {
          return res.status(400).json({ error: 'Descrição, valor e data são obrigatórios.' });
      }
      const newIncome = await VariableIncome.create(userId, req.body);
      res.status(201).json(newIncome);
    } catch (error) {
      console.error('Erro ao criar renda variável:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao criar a renda variável.' });
    }
  },

  updateVariableIncome: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updatedIncome = await VariableIncome.update(id, userId, req.body);
      if (!updatedIncome) {
        return res.status(404).json({ error: 'Renda variável não encontrada ou não pertence ao usuário.' });
      }
      res.status(200).json(updatedIncome);
    } catch (error) {
      console.error('Erro ao atualizar renda variável:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao atualizar a renda variável.' });
    }
  },

  deleteVariableIncome: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const success = await VariableIncome.remove(id, userId);
      if (!success) {
        return res.status(404).json({ error: 'Renda variável não encontrada ou não pertence ao usuário.' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar renda variável:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao deletar a renda variável.' });
    }
  }
};

module.exports = variableIncomeController;
