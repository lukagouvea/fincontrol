const db = require('../config/db');

const FixedIncome = {
  // Busca todas as rendas fixas e retorna em camelCase.
  getAllByUserId: async (userId) => {
    const query = `
      SELECT 
        id,
        description,
        amount,
        category_id AS \"categoryId\",
        is_active AS \"isActive\",
        start_date AS \"startDate\",
        end_date AS \"endDate\",
        recurrence_day AS day
      FROM fixed_incomes
      WHERE user_id = $1
      ORDER BY day;
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  // Recebe dados em camelCase, traduz para snake_case para o DB.
  create: async (userId, incomeData) => {
    // Pega os dados em camelCase do corpo da requisição
    const {
      description, 
      amount, 
      categoryId, 
      isActive = true, 
      startDate, 
      endDate, 
      day 
    } = incomeData;

    const query = `
      INSERT INTO fixed_incomes (user_id, description, amount, category_id, is_active, start_date, end_date, recurrence_day)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        description,
        amount,
        category_id AS \"categoryId\",
        is_active AS \"isActive\",
        start_date AS \"startDate\",
        end_date AS \"endDate\",
        recurrence_day AS day;
    `;
    
    // Usa as variáveis camelCase para montar a query com colunas snake_case
    const values = [userId, description, amount, categoryId, isActive, startDate, endDate, day];
    const { rows } = await db.query(query, values);
    return rows[0];
  },

};

module.exports = FixedIncome;
