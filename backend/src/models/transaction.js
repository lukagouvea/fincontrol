const db = require('../config/db');

const getAll = async (userId) => {
  const result = await db.query(
    'SELECT t.*, c.name as category_name FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1 ORDER BY t.date DESC',
    [userId]
  );
  return result.rows;
};

const getById = async (id, userId) => {
  const result = await db.query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [id, userId]);
  return result.rows[0];
};

const create = async (userId, type, amount, description, category_id) => {
  const result = await db.query(
    'INSERT INTO transactions (user_id, type, amount, description, category_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [userId, type, amount, description, category_id]
  );
  return result.rows[0];
};

const update = async (id, userId, type, amount, description, category_id) => {
  const result = await db.query(
    'UPDATE transactions SET type = $1, amount = $2, description = $3, category_id = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
    [type, amount, description, category_id, id, userId]
  );
  return result.rows[0];
};

const remove = async (id, userId) => {
  await db.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, userId]);
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};