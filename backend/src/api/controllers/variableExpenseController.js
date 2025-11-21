
const VariableExpense = require('../../models/variableExpense');

const variableExpenseController = {
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

  createVariableExpense: async (req, res) => {
    try {
      const userId = req.user.id;
      if (!req.body.description || !req.body.amount || !req.body.expense_date) {
        return res.status(400).json({ error: 'Descrição, valor e data são obrigatórios.' });
      }
      const newExpense = await VariableExpense.create(userId, req.body);
      res.status(201).json(newExpense);
    } catch (error) {
      console.error('Erro ao criar despesa variável:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao criar a despesa variável.' });
    }
  },

  updateVariableExpense: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updatedExpense = await VariableExpense.update(id, userId, req.body);
      if (!updatedExpense) {
        return res.status(404).json({ error: 'Despesa variável não encontrada ou não pertence ao usuário.' });
      }
      res.status(200).json(updatedExpense);
    } catch (error) {
      console.error('Erro ao atualizar despesa variável:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao atualizar a despesa variável.' });
    }
  },

  deleteVariableExpense: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const success = await VariableExpense.remove(id, userId);
      if (!success) {
        return res.status(404).json({ error: 'Despesa variável não encontrada ou não pertence ao usuário.' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar despesa variável:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao deletar a despesa variável.' });
    }
  }
};

module.exports = variableExpenseController;
