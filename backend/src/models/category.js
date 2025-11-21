
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
  const fields = [];
  const values = [];
  let fieldIndex = 1;

  // Mapeia as chaves do frontend (camelCase) para as colunas do DB (snake_case)
  const fieldMapping = {
    name: 'name',
    description: 'description',
    type: 'type',
    color: 'color'
  };

  for (const [key, value] of Object.entries(categoryData)) {
    if (fieldMapping[key] && value !== undefined) {
      fields.push(`${fieldMapping[key]} = $${fieldIndex++}`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    // Se nenhum campo foi enviado, retorna a categoria atual sem fazer update
    return getByIdAndUserId(id, userId);
  }

  values.push(id, userId);

  const query = `
    UPDATE categories 
    SET ${fields.join(', '')} 
    WHERE id = $${fieldIndex++} AND user_id = $${fieldIndex}
    RETURNING *;
  `;

  const { rows } = await db.query(query, values);
  return rows[0];
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
