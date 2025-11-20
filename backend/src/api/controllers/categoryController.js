const Category = require('../../models/category');

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.getAll();
    res.status(200).json(categories);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};

exports.getCategoryById = async (req, res) => {
  const { id } = req.params;
  try {
    const category = await Category.getById(id);
    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }
    res.status(200).json(category);
  } catch (error) {
    console.error('Erro ao buscar categoria:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};

exports.createCategory = async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
  }
  try {
    const newCategory = await Category.create(name, description);
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};

exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
  }
  try {
    const updatedCategory = await Category.update(id, name, description);
    if (!updatedCategory) {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }
    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};

exports.deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    await Category.remove(id);
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar categoria:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};