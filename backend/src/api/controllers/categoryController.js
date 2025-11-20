const Category = require('../../models/category');

// Altera getAllCategories para buscar por usuário
exports.getAllCategories = async (req, res) => {
  try {
    // O ID do usuário vem do middleware de autenticação
    const userId = req.user.id;
    const categories = await Category.getAllByUserId(userId);
    res.status(200).json(categories);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};

exports.getCategoryById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; // Garante que a categoria pertence ao usuário
  try {
    const category = await Category.getByIdAndUserId(id, userId);
    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }
    res.status(200).json(category);
  } catch (error) {
    console.error('Erro ao buscar categoria:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};

// Corrige a criação de categoria para incluir o ID do usuário
exports.createCategory = async (req, res) => {
  try {
    const userId = req.user.id; // Pega o ID do usuário do token
    const categoryData = { ...req.body }; // Pega todos os dados do formulário

    if (!categoryData.name || !categoryData.type) {
      return res.status(400).json({ error: 'Nome e tipo da categoria são obrigatórios.' });
    }

    const newCategory = await Category.create(userId, categoryData);
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    // Verifica erro de unicidade
    if (error.code === '23505') {
        return res.status(409).json({ error: 'Você já possui uma categoria com este nome e tipo.' });
    }
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};

// Corrige a atualização para garantir que o usuário seja o dono
exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const categoryData = req.body;

  try {
    const updatedCategory = await Category.update(id, userId, categoryData);
    if (!updatedCategory) {
      return res.status(404).json({ error: 'Categoria não encontrada ou não pertence a você.' });
    }
    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    if (error.code === '23505') {
        return res.status(409).json({ error: 'Você já possui uma categoria com este nome e tipo.' });
    }
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};

// Corrige o delete para garantir que o usuário seja o dono
exports.deleteCategory = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const success = await Category.remove(id, userId);
    if (!success) {
      return res.status(404).json({ error: 'Categoria não encontrada ou não pertence a você.' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar categoria:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};