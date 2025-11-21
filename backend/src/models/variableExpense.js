const db = require('../config/db');

const VariableExpense = {
  getAllByUserId: async (userId) => {
    const query = `
      SELECT 
        ve.id, 
        ve.description, 
        ve.amount, 
        ve.expense_date AS \"date\",
        ve.category_id AS \"categoryId\",
        c.name AS \"categoryName\", 
        c.color AS \"categoryColor\"
      FROM variable_expenses ve
      LEFT JOIN categories c ON ve.category_id = c.id
      WHERE ve.user_id = $1
      ORDER BY \"date\" DESC;
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  create: async (userId, expenseData) => {
    const { description, amount, category_id, expense_date } = expenseData;
    const query = `
      INSERT INTO variable_expenses (user_id, description, amount, category_id, expense_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, description, amount, category_id AS \"categoryId\", expense_date AS \"date\";
    `;
    const values = [userId, description, amount, category_id, expense_date];
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
        category_id: 'category_id',
        expense_date: 'expense_date'
    };

    for (const [key, value] of Object.entries(expenseData)) {
        if (fieldMapping[key] !== undefined) {
            fields.push(`${fieldMapping[key]} = $${fieldIndex++}`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        const { rows } = await db.query('SELECT * FROM variable_expenses WHERE id = $1 AND user_id = $2', [id, userId]);
        return rows.length > 0 ? rows[0] : null;
    }

    values.push(id, userId);

    const setClause = fields.join(', ');
    const query = `UPDATE variable_expenses SET ${setClause} WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2} RETURNING id, description, amount, category_id AS \"categoryId\", expense_date AS \"date\"`;

    const { rows } = await db.query(query, values);
    return rows.length > 0 ? rows[0] : null;
  },

  remove: async (id, userId) => {
    const result = await db.query('DELETE FROM variable_expenses WHERE id = $1 AND user_id = $2', [id, userId]);
    return result.rowCount > 0;
  }
};

module.exports = VariableExpense;
