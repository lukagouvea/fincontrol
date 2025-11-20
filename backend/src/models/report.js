const db = require('../config/db');

const getMonthlyReport = async (userId, month, year) => {
  const result = await db.query(
    `SELECT 
      c.name as category_name,
      SUM(CASE WHEN t.type = 'receita' THEN t.amount ELSE 0 END) as total_income,
      SUM(CASE WHEN t.type = 'despesa' THEN t.amount ELSE 0 END) as total_expense
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1
      AND EXTRACT(MONTH FROM t.date) = $2
      AND EXTRACT(YEAR FROM t.date) = $3
    GROUP BY c.name
    ORDER BY c.name`,
    [userId, month, year]
  );
  return result.rows;
};

module.exports = {
  getMonthlyReport,
};