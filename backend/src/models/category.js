const db = require('../config/db');

const Category = {
  getAllByUserId: async (userId) => {
    const { rows } = await db.query('SELECT * FROM categories WHERE user_id = $1 ORDER BY name', [userId]);
    return rows;
  },

  getById: async (id, userId) => {
    const { rows } = await db.query('SELECT * FROM categories WHERE id = $1 AND user_id = $2', [id, userId]);
    return rows[0];
  },

  create: async (categoryData, userId) => {
    const { name, color } = categoryData;
    const { rows } = await db.query(
      'INSERT INTO categories (name, color, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, color, userId]
    );
    return rows[0];
  },

  update: async (id, userId, categoryData) => {
    const fields = [];
    const values = [];
    let fieldIndex = 1;

    const fieldMapping = {
        name: 'name',
        color: 'color'
    };

    for (const [key, value] of Object.entries(categoryData)) {
        if (fieldMapping[key] !== undefined && value !== undefined) {
            fields.push(`${fieldMapping[key]} = $${fieldIndex++}`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
      const { rows } = await db.query('SELECT * FROM categories WHERE id = $1 AND user_id = $2', [id, userId]);
      return rows.length > 0 ? rows[0] : null;
    }

    values.push(id, userId);

    const setClause = fields.join(', ');
    const query = `UPDATE categories SET ${setClause} WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2} RETURNING *`;

    const { rows } = await db.query(query, values);
    return rows.length > 0 ? rows[0] : null;
  },

  remove: async (id, userId) => {
    const { rowCount } = await db.query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [id, userId]);
    return rowCount;
  }
};

module.exports = Category;
