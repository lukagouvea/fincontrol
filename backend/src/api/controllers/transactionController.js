const Transaction = require('../../models/transaction');

exports.getAllTransactions = async (req, res) => {
  const userId = req.user.id; // Vem do middleware de autenticação
  try {
    const transactions = await Transaction.getAll(userId);
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};

exports.getTransactionById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const transaction = await Transaction.getById(id, userId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }
    res.status(200).json(transaction);
  } catch (error) {
    console.error('Erro ao buscar transação:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};

exports.createTransaction = async (req, res) => {
  const userId = req.user.id;
  const { type, amount, description, category_id } = req.body;

  if (!type || !amount || !category_id) {
    return res.status(400).json({ error: 'Tipo, valor e categoria são obrigatórios.' });
  }

  try {
    const newTransaction = await Transaction.create(userId, type, amount, description, category_id);
    res.status(201).json(newTransaction);
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};

exports.updateTransaction = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { type, amount, description, category_id } = req.body;

  if (!type || !amount || !category_id) {
    return res.status(400).json({ error: 'Tipo, valor e categoria são obrigatórios.' });
  }

  try {
    const updatedTransaction = await Transaction.update(id, userId, type, amount, description, category_id);
    if (!updatedTransaction) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }
    res.status(200).json(updatedTransaction);
  } catch (error) {
    console.error('Erro ao atualizar transação:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};

exports.deleteTransaction = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    await Transaction.remove(id, userId);
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar transação:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};