const db = require('../config/db');

const FixedIncome = {
  // Busca todas as rendas fixas de um usuário
  getAllByUserId: async (userId) => {
    const query = `
      SELECT 
        id, 
        description, 
        amount, 
        recurrence_day as day, -- Correção: Busca "recurrence_day" e renomeia para "day"
        category_id, 
        start_date, 
        end_date
      FROM fixed_incomes
      WHERE user_id = $1
      ORDER BY recurrence_day; -- Correção: Ordena pela coluna real
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  // Cria uma nova renda fixa
  create: async (userId, incomeData) => {
    const { description, amount, day, category_id, start_date, end_date } = incomeData;
    const query = `
      INSERT INTO fixed_incomes (user_id, description, amount, recurrence_day, category_id, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, description, amount, recurrence_day as day, category_id, start_date, end_date; -- Correção: Insere em "recurrence_day"
    `;
    const values = [userId, description, amount, day, category_id, start_date, end_date];
    const { rows } = await db.query(query, values);
    return rows[0];
  },

  // Adicionar outras funções de CRUD (update, delete) aqui no futuro
};

module.exports = FixedIncome;
