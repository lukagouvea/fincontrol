
const FixedExpense = require('../../models/fixedExpense');

const fixedExpenseController = {
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

  createFixedExpense: async (req, res) => {
    try {
      const userId = req.user.id;
      if (!req.body.description || !req.body.amount || !req.body.start_date || !req.body.day) {
        return res.status(400).json({ error: 'Descrição, valor, data de início e dia de recorrência são obrigatórios.' });
      }
      const newExpense = await FixedExpense.create(userId, req.body);
      res.status(201).json(newExpense);
    } catch (error) {
      console.error('Erro ao criar despesa fixa:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao criar a despesa fixa.' });
    }
  },

  updateFixedExpense: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updatedExpense = await FixedExpense.update(id, userId, req.body);
      if (!updatedExpense) {
        return res.status(404).json({ error: 'Despesa fixa não encontrada ou não pertence ao usuário.' });
      }
      res.status(200).json(updatedExpense);
    } catch (error) {
      console.error('Erro ao atualizar despesa fixa:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao atualizar a despesa fixa.' });
    }
  },

  deleteFixedExpense: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const success = await FixedExpense.remove(id, userId);
      if (!success) {
        return res.status(404).json({ error: 'Despesa fixa não encontrada ou não pertence ao usuário.' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar despesa fixa:', error);
      res.status(500).json({ error: 'Ocorreu um erro interno ao deletar a despesa fixa.' });
    }
  }
};

module.exports = fixedExpenseController;
