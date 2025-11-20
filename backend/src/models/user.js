const db = require('../config/db');
const bcrypt = require('bcryptjs');

const findByEmail = async (email) => {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
};

// Função adicionada para buscar usuário pelo ID
const findById = async (id) => {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
};

const createUser = async (name, email, password) => {
  const password_hash = await bcrypt.hash(password, 8);
  const result = await db.query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, registration_date',
    [name, email, password_hash]
  );
  return result.rows[0];
};

const comparePasswords = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

module.exports = {
  findByEmail,
  findById, // Exportando a nova função
  createUser,
  comparePasswords,
};