const db = require('../config/db');

const MonthlyVariation = {
  getAllByUserId: async (userId) => {
    // Busca variações de renda
    const incomeQuery = `
      SELECT 
        id, 
        fixed_income_id as fixed_item_id, 
        'income' as type, 
        year, 
        month, 
        amount,
        user_id
      FROM income_variations
      WHERE user_id = $1;
    `;
    const incomePromise = db.query(incomeQuery, [userId]);

    // Busca variações de despesa
    const expenseQuery = `
      SELECT 
        id, 
        fixed_expense_id as fixed_item_id, 
        'expense' as type, 
        year, 
        month, 
        amount,
        user_id
      FROM expense_variations
      WHERE user_id = $1;
    `;
    const expensePromise = db.query(expenseQuery, [userId]);

    // Executa as duas consultas em paralelo
    const [incomeResult, expenseResult] = await Promise.all([incomePromise, expensePromise]);

    // Combina os resultados e retorna
    return [...incomeResult.rows, ...expenseResult.rows];
  },
};

module.exports = MonthlyVariation;
