const db = require('../config/db');

const VariableIncome = {
  // Busca todas as rendas variáveis de um usuário
  getAllByUserId: async (userId) => {
    const query = `
      SELECT 
        id, 
        description, 
        amount, 
        date, -- A coluna já se chama 'date'
        category_id 
      FROM variable_incomes 
      WHERE user_id = $1 
      ORDER BY date DESC; -- Ordenando pela coluna real
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  // Outras funções de CRUD podem ser adicionadas aqui
};

module.exports = VariableIncome;
