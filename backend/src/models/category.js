const db = require('../config/db');

// Busca todas as categorias de um usuário específico
const getAllByUserId = async (userId) => {
  const query = 'SELECT * FROM categories WHERE user_id = $1 ORDER BY name';
  const { rows } = await db.query(query, [userId]);
  return rows;
};

// Busca uma categoria pelo seu ID e ID do usuário para garantir a posse
const getByIdAndUserId = async (id, userId) => {
  const query = 'SELECT * FROM categories WHERE id = $1 AND user_id = $2';
  const { rows } = await db.query(query, [id, userId]);
  return rows[0];
};

// Cria uma nova categoria para um usuário
const create = async (userId, categoryData) => {
  const { name, description, type, color } = categoryData;
  const query = `
    INSERT INTO categories (user_id, name, description, type, color)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [userId, name, description, type, color];
  const { rows } = await db.query(query, values);
  return rows[0];
};

// Atualiza uma categoria, garantindo que ela pertence ao usuário
const update = async (id, userId, categoryData) => {
  const { name, description, type, color } = categoryData;
  const query = `
    UPDATE categories 
    SET name = $1, description = $2, type = $3, color = $4 
    WHERE id = $5 AND user_id = $6
    RETURNING *;
  `;
  const values = [name, description, type, color, id, userId];
  const { rows } = await db.query(query, values);
  return rows[0]; // Retorna undefined se a categoria não for encontrada ou não pertencer ao usuário
};

// Remove uma categoria, garantindo que ela pertence ao usuário
const remove = async (id, userId) => {
  const query = 'DELETE FROM categories WHERE id = $1 AND user_id = $2';
  const result = await db.query(query, [id, userId]);
  return result.rowCount > 0; // Retorna true se uma linha foi deletada, false caso contrário
};

module.exports = {
  getAllByUserId, 
  getByIdAndUserId, 
  create,
  update,
  remove,
};
