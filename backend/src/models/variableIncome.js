
const db = require('../config/db');

const VariableIncome = {
  getAllByUserId: async (userId) => {
    const query = `
      SELECT 
        id, description, amount,
        category_id as \"categoryId\",
        income_date as \"date\"
      FROM variable_incomes
      WHERE user_id = $1
      ORDER BY \"date\" DESC;
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  create: async (userId, incomeData) => {
    const { description, amount, category_id, income_date } = incomeData;
    const query = `
      INSERT INTO variable_incomes (user_id, description, amount, category_id, income_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, description, amount, category_id as \"categoryId\", income_date as \"date\";
    `;
    const values = [userId, description, amount, category_id, income_date];
    const { rows } = await db.query(query, values);
    return rows[0];
  },

  update: async (id, userId, incomeData) => {
    const fields = [];
    const values = [];
    let fieldIndex = 1;

    const fieldMapping = {
        description: 'description',
        amount: 'amount',
        category_id: 'category_id',
        income_date: 'income_date'
    };

    for (const [key, value] of Object.entries(incomeData)) {
        if (fieldMapping[key] !== undefined) {
            fields.push(`${fieldMapping[key]} = $${fieldIndex++}`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        const { rows } = await db.query('SELECT * FROM variable_incomes WHERE id = $1 AND user_id = $2', [id, userId]);
        return rows[0];
    }

    values.push(id, userId);

    const query = `
      UPDATE variable_incomes 
      SET ${fields.join(', ')} 
      WHERE id = $${fieldIndex++} AND user_id = $${fieldIndex}
      RETURNING id, description, amount, category_id as \"categoryId\", income_date as \"date\";
    `;

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  remove: async (id, userId) => {
    const result = await db.query('DELETE FROM variable_incomes WHERE id = $1 AND user_id = $2', [id, userId]);
    return result.rowCount > 0;
  }
};

module.exports = VariableIncome;
