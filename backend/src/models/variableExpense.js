const db = require('../config/db');

const VariableExpense = {
  // Busca todas as despesas variáveis de um usuário (com detalhes da categoria)
  getAllByUserId: async (userId) => {
    const query = `
      SELECT 
        ve.id, ve.description, ve.amount, ve.date, ve.category_id,
        c.name as category_name, c.color as category_color
      FROM variable_expenses ve
      LEFT JOIN categories c ON ve.category_id = c.id
      WHERE ve.user_id = $1
      ORDER BY ve.date DESC;
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  // Outras funções de CRUD podem ser adicionadas aqui
};

module.exports = VariableExpense;
