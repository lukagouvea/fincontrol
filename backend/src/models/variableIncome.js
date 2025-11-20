const db = require('../config/db');

const VariableIncome = {
  // Busca todas as rendas variáveis de um usuário
  getAllByUserId: async (userId) => {
    const query = `
      SELECT 
        id, 
        description, 
        amount, 
        reception_date as date, -- Correção: Usa a coluna correta "reception_date"
        category_id
      FROM variable_incomes
      WHERE user_id = $1
      ORDER BY reception_date DESC; -- Correção: Ordena pela coluna correta
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  // Adicionar outras funções de CRUD (create, update, delete) aqui no futuro
};

module.exports = VariableIncome;
