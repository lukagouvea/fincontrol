const db = require('../config/db');

const VariableIncome = {
  // Busca todas as rendas variáveis de um usuário
  getAllByUserId: async (userId) => {
    const query = `
      SELECT 
        id, 
        description, 
        amount, 
        income_date as date, -- Renomeando para 'date' para corresponder ao frontend
        category_id 
      FROM variable_incomes 
      WHERE user_id = $1 
      ORDER BY income_date DESC; -- Ordenando pela coluna real
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  // Outras funções de CRUD podem ser adicionadas aqui
};

module.exports = VariableIncome;
