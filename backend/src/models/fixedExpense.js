const db = require('../config/db');

const FixedExpense = {
  // Busca todas as despesas fixas de um usuário
  getAllByUserId: async (userId) => {
    const query = `
      SELECT id, description, amount, day, category_id, start_date, end_date, is_active
      FROM fixed_expenses
      WHERE user_id = $1
      ORDER BY day;
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  // Adicionar outras funções de CRUD (create, update, delete) aqui no futuro
};

module.exports = FixedExpense;
