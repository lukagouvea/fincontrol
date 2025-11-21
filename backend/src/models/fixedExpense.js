
const db = require('../config/db');

const FixedExpense = {
  getAllByUserId: async (userId) => {
    const query = `
      SELECT 
        id, description, amount, day,
        category_id AS \"categoryId\",
        start_date AS \"startDate\",
        end_date AS \"endDate\"
      FROM fixed_expenses
      WHERE user_id = $1
      ORDER BY day;
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  create: async (userId, expenseData) => {
    const { description, amount, day, category_id, start_date, end_date } = expenseData;
    const query = `
      INSERT INTO fixed_expenses (user_id, description, amount, day, category_id, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, description, amount, day, category_id AS \"categoryId\", start_date AS \"startDate\", end_date AS \"endDate\";
    `;
    const values = [userId, description, amount, day, category_id, start_date, end_date];
    const { rows } = await db.query(query, values);
    return rows[0];
  },

  update: async (id, userId, expenseData) => {
    const fields = [];
    const values = [];
    let fieldIndex = 1;

    const fieldMapping = {
        description: 'description',
        amount: 'amount',
        day: 'day',
        category_id: 'category_id',
        start_date: 'start_date',
        end_date: 'end_date'
    };

    for (const [key, value] of Object.entries(expenseData)) {
        if (fieldMapping[key] !== undefined) {
            fields.push(`${fieldMapping[key]} = $${fieldIndex++}`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        const { rows } = await db.query('SELECT * FROM fixed_expenses WHERE id = $1 AND user_id = $2', [id, userId]);
        return rows[0];
    }

    values.push(id, userId);

    const query = `
      UPDATE fixed_expenses 
      SET ${fields.join(', ')} 
      WHERE id = $${fieldIndex++} AND user_id = $${fieldIndex}
      RETURNING id, description, amount, day, category_id AS \"categoryId\", start_date AS \"startDate\", end_date AS \"endDate\";
    `;

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  remove: async (id, userId) => {
    const result = await db.query('DELETE FROM fixed_expenses WHERE id = $1 AND user_id = $2', [id, userId]);
    return result.rowCount > 0;
  }
};

module.exports = FixedExpense;
