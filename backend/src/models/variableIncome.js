const db = require('../config/db');

const VariableIncome = {
  // Busca todas as rendas variáveis e retorna em camelCase.
  getAllByUserId: async (userId) => {
    const query = `
      SELECT 
        id, 
        description, 
        amount, 
        category_id as \"categoryId\",
        reception_date as \"receptionDate\" -- Busca snake_case, retorna camelCase
      FROM variable_incomes
      WHERE user_id = $1
      ORDER BY \"receptionDate\" DESC;
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  // Recebe dados em camelCase, traduz para snake_case para o DB.
  create: async (userId, incomeData) => {
    const { description, amount, categoryId, receptionDate } = incomeData;

    const query = `
      INSERT INTO variable_incomes (user_id, description, amount, category_id, reception_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id, 
        description, 
        amount, 
        category_id as \"categoryId\",
        reception_date as \"receptionDate\";
    `;
    const values = [userId, description, amount, categoryId, receptionDate];
    const { rows } = await db.query(query, values);
    return rows[0];
  },

};

module.exports = VariableIncome;
