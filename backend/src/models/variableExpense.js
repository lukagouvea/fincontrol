const db = require('../config/db');

const VariableExpense = {
  // Busca todas as despesas variáveis e retorna em camelCase.
  getAllByUserId: async (userId) => {
    const query = `
      SELECT 
        ve.id, 
        ve.description, 
        ve.amount, 
        ve.expense_date AS \"expenseDate\",
        ve.category_id AS \"categoryId\",
        c.name AS \"categoryName\", 
        c.color AS \"categoryColor\"
      FROM variable_expenses ve
      LEFT JOIN categories c ON ve.category_id = c.id
      WHERE ve.user_id = $1
      ORDER BY \"expenseDate\" DESC;
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  // Recebe dados em camelCase, traduz para snake_case para o DB.
  create: async (userId, expenseData) => {
    const { description, amount, categoryId, expenseDate } = expenseData;

    const query = `
      INSERT INTO variable_expenses (user_id, description, amount, category_id, expense_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id,
        description,
        amount,
        category_id AS \"categoryId\",
        expense_date AS \"expenseDate\";
    `;
    const values = [userId, description, amount, categoryId, expenseDate];
    const { rows } = await db.query(query, values);
    
    // NOTA: A query de retorno não pode pegar os dados da tabela de categorias (categoryName, categoryColor)
    // porque a linha acabou de ser inserida. O frontend pode precisar buscar a categoria separadamente
    // ou ter essa informação em cache se precisar exibir o nome/cor imediatamente após a criação.
    return rows[0];
  },

};

module.exports = VariableExpense;
