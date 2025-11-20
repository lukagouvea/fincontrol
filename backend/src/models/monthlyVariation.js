const db = require('../config/db');

const MonthlyVariation = {
  getAllByUserId: async (userId) => {
    // Busca variações de renda
    const incomeQuery = `
      SELECT 
        iv.id, 
        iv.fixed_income_id as fixed_item_id, 
        'income' as type, 
        iv.year, 
        iv.month, 
        iv.amount
      FROM income_variations iv
      JOIN fixed_incomes fi ON iv.fixed_income_id = fi.id
      WHERE fi.user_id = $1;
    `;
    const incomePromise = db.query(incomeQuery, [userId]);

    // Busca variações de despesa
    const expenseQuery = `
      SELECT 
        ev.id, 
        ev.fixed_expense_id as fixed_item_id, 
        'expense' as type, 
        ev.year, 
        ev.month, 
        ev.amount
      FROM expense_variations ev
      JOIN fixed_expenses fe ON ev.fixed_expense_id = fe.id
      WHERE fe.user_id = $1;
    `;
    const expensePromise = db.query(expenseQuery, [userId]);

    // Executa as duas consultas em paralelo
    const [incomeResult, expenseResult] = await Promise.all([incomePromise, expensePromise]);

    // Combina os resultados e retorna
    return [...incomeResult.rows, ...expenseResult.rows];
  },
};

module.exports = MonthlyVariation;
