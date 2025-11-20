const db = require('../config/db');

const VariableIncome = {
  // Busca todas as rendas variáveis de um usuário
  getAllByUserId: async (userId) => {
    const query = `
      SELECT 
        id, 
        description, 
        amount, 
        transaction_date as date, -- Correção: Busca "transaction_date" e renomeia para "date"
        category_id
      FROM variable_incomes
      WHERE user_id = $1
      ORDER BY transaction_date DESC; -- Correção: Ordena pela coluna real
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  // Adicionar outras funções de CRUD (create, update, delete) aqui no futuro
};

module.exports = VariableIncome;
