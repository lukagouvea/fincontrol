const db = require('../config/db');

const FixedIncome = {
  // Busca todas as rendas fixas de um usuário
  getAllByUserId: async (userId) => {
    const query = `
      SELECT 
        id, 
        description, 
        amount, 
        recurrence_day as day, -- Renomeando para 'day' para corresponder ao frontend
        category_id, 
        start_date, 
        end_date, 
        is_active
      FROM fixed_incomes
      WHERE user_id = $1
      ORDER BY recurrence_day; -- Ordenando pela coluna real
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  // Adicionar outras funções de CRUD (create, update, delete) aqui no futuro
};

module.exports = FixedIncome;
