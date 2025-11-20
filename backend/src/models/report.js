const db = require('../config/db');

const getMonthlyReport = async (userId, month, year) => {
  // Esta consulta complexa une todas as diferentes fontes de transação
  // para criar um relatório mensal agregado, respeitando o schema do banco de dados.
  const query = `
    SELECT
      COALESCE(category_name, 'Sem Categoria') as category,
      SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as total_expense
    FROM (
      -- Rendas Variáveis
      SELECT vi.amount, 'INCOME' as type, c.name as category_name
      FROM variable_incomes vi 
      LEFT JOIN categories c ON vi.category_id = c.id AND c.user_id = vi.user_id
      WHERE vi.user_id = $1 AND EXTRACT(MONTH FROM vi.reception_date) = $2 AND EXTRACT(YEAR FROM vi.reception_date) = $3
      
      UNION ALL
      
      -- Despesas Variáveis
      SELECT ve.amount, 'EXPENSE' as type, c.name as category_name
      FROM variable_expenses ve 
      JOIN categories c ON ve.category_id = c.id AND c.user_id = ve.user_id
      WHERE ve.user_id = $1 AND EXTRACT(MONTH FROM ve.expense_date) = $2 AND EXTRACT(YEAR FROM ve.expense_date) = $3
      
      UNION ALL
      
      -- Parcelas (consideradas Despesas)
      SELECT i.amount, 'EXPENSE' as type, c.name as category_name
      FROM installments i 
      JOIN installment_purchases ip ON i.purchase_id = ip.id 
      JOIN categories c ON ip.category_id = c.id AND c.user_id = ip.user_id
      WHERE ip.user_id = $1 AND EXTRACT(MONTH FROM i.due_date) = $2 AND EXTRACT(YEAR FROM i.due_date) = $3
      
      UNION ALL
      
      -- Rendas Fixas
      SELECT fi.amount, 'INCOME' as type, c.name as category_name
      FROM fixed_incomes fi 
      LEFT JOIN categories c ON fi.category_id = c.id AND c.user_id = fi.user_id
      WHERE fi.user_id = $1 AND fi.is_active = TRUE 
        AND make_date($3, $2, 1) >= date_trunc('month', fi.start_date)
        AND (fi.end_date IS NULL OR make_date($3, $2, 1) <= date_trunc('month', fi.end_date))
        
      UNION ALL
      
      -- Despesas Fixas
      SELECT fe.amount, 'EXPENSE' as type, c.name as category_name
      FROM fixed_expenses fe 
      JOIN categories c ON fe.category_id = c.id AND c.user_id = fe.user_id
      WHERE fe.user_id = $1 AND fe.is_active = TRUE 
        AND make_date($3, $2, 1) >= date_trunc('month', fe.start_date)
        AND (fe.end_date IS NULL OR make_date($3, $2, 1) <= date_trunc('month', fe.end_date))

    ) as all_transactions
    GROUP BY category_name
    ORDER BY category_name;
  `;

  const result = await db.query(query, [userId, month, year]);
  return result.rows;
};

module.exports = {
  getMonthlyReport,
};
