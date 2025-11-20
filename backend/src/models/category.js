const db = require('../config/db');

const getAll = async () => {
  const result = await db.query('SELECT * FROM categories ORDER BY name');
  return result.rows;
};

const getById = async (id) => {
  const result = await db.query('SELECT * FROM categories WHERE id = $1', [id]);
  return result.rows[0];
};

const create = async (name, description) => {
  const result = await db.query(
    'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
    [name, description]
  );
  return result.rows[0];
};

const update = async (id, name, description) => {
  const result = await db.query(
    'UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *',
    [name, description, id]
  );
  return result.rows[0];
};

const remove = async (id) => {
  await db.query('DELETE FROM categories WHERE id = $1', [id]);
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};