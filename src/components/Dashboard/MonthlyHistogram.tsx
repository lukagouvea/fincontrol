import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Transaction, FixedIncome, FixedExpense, Category } from '../../context/FinanceContext';
type MonthlyHistogramProps = {
  transactions: Transaction[];
  categories: Category[];
  fixedIncomes: FixedIncome[];
  fixedExpenses: FixedExpense[];
  date: Date;
};
export const MonthlyHistogram: React.FC<MonthlyHistogramProps> = ({
  transactions,
  categories,
  fixedIncomes,
  fixedExpenses,
  date
}) => {
  // 2. Extrair o ano e o mês atual
  // getMonth() retorna o mês de 0 (Janeiro) a 11 (Dezembro), por isso somamos 1.
   // Ex: Para Outubro, retorna 10


  function isItemActiveInMonth(
    item: { startDate: string; endDate?: string | null },
    targetDate: Date
  ): boolean {
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth(); // 0-11

    const startDate = new Date(item.startDate);
    // Adiciona a correção para o fuso horário ao criar a data
    startDate.setMinutes(startDate.getMinutes() + startDate.getTimezoneOffset());
    
    const endDate = item.endDate ? new Date(item.endDate) : null;
    if(endDate) {
      endDate.setMinutes(endDate.getMinutes() + endDate.getTimezoneOffset());
    }
    
    // Condição de Início: O item deve ter começado no passado ou neste mês/ano.
    const startValid =
      startDate.getFullYear() < targetYear ||
      (startDate.getFullYear() === targetYear && startDate.getMonth() <= targetMonth);
    
    // Condição de Fim: O item não deve ter uma data de fim, ou a data de fim
    // é no futuro ou neste mês/ano.
    const endValid =
      !endDate ||
      endDate.getFullYear() > targetYear ||
      (endDate.getFullYear() === targetYear && endDate.getMonth() >= targetMonth);

    return startValid && endValid;
  }

  const anoAtual = date.getFullYear(); // Ex: 2025
  const mesAtual = date.getMonth() + 1;

  const last12Months = Array.from({
    length: 12
  }, (_, i) => {
    const data = new Date(anoAtual, mesAtual - i, 1);
    return data;
  }).reverse();
  // Formatar os dados para o gráfico
  const data = last12Months.map(dateObj => {
    const anoObj = dateObj.getFullYear();
    const mesObj = dateObj.getMonth() + 1; // Janeiro é 0
    const anoMesAtualString = `${anoObj}-${String(mesObj).padStart(2, '0')}`; // Ex: "2025-10"

    const monthlyVariableIncome = transactions.filter(t => 'categoryId' in t && categories.find(c => c.id === t.categoryId)?.type === 'income' && t.date.startsWith(anoMesAtualString)).reduce((sum, t) => sum + t.amount, 0);
    // Rendas fixas do mês atual
    const monthlyFixedIncome = fixedIncomes
      .filter(income => isItemActiveInMonth(income, dateObj))
      .reduce((sum, income) => sum + income.amount, 0);
    // Total de rendas (fixas + variáveis)
    const monthlyIncome = monthlyVariableIncome + monthlyFixedIncome;
    // Despesas variáveis do mês atual
    const monthlyVariableExpense = transactions.filter(t => 'isInstallment' in t && t.date.startsWith(anoMesAtualString)).reduce((sum, t) => sum + t.amount, 0);

    // Despesas fixas do mês atual (Igualmente limpo!)
    const monthlyFixedExpense = fixedExpenses
      .filter(expense => isItemActiveInMonth(expense, dateObj))
      .reduce((sum, expense) => sum + expense.amount, 0);
    // Total de despesas (fixas + variáveis)
    const monthlyExpense = monthlyVariableExpense + monthlyFixedExpense;
    // Calcular o saldo
    const balance = monthlyIncome - monthlyExpense;
    return {
      month: dateObj.toLocaleDateString('pt-BR', {
        month: 'short'
      }),
      balance: balance
    };
  });
  return <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis 
                tickFormatter={value => new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(value as number)}
            />
            <Tooltip 
                formatter={(value) => [new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                }).format(Number(value)), 'Saldo']}
            />
            {/* 4. Barra única para o saldo com cores condicionais */}
            <Bar dataKey="balance" name="Saldo" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={entry.balance >= 0 ? '#22c55e' : '#ef4444'} 
                    />
                ))}
            </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>;
};