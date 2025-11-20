const db = require('../config/db');

const MonthlyVariation = {
  // Busca todas as variações mensais de um usuário
  getAllByUserId: async (userId) => {
    const query = `
      SELECT id, fixed_item_id, type, year, month, amount
      FROM monthly_variations
      WHERE user_id = $1;
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  // Adicionar outras funções de CRUD (create, update, delete) aqui no futuro
};

module.exports = MonthlyVariation;
