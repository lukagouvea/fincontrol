import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../../context/FinanceContext';
type MonthlyHistogramProps = {
  transactions: Transaction[];
};
export const MonthlyHistogram: React.FC<MonthlyHistogramProps> = ({
  transactions
}) => {
  // Obter os últimos 6 meses
  const today = new Date();
  const last6Months = Array.from({
    length: 6
  }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    return date;
  }).reverse();
  // Formatar os dados para o gráfico
  const data = last6Months.map(date => {
    const month = date.getMonth();
    const year = date.getFullYear();
    // Filtrar transações de despesa para este mês
    const monthlyExpenses = transactions.filter(t => 'isInstallment' in t).filter(t => {
      const transDate = new Date(t.date);
      return transDate.getMonth() === month && transDate.getFullYear() === year;
    }).reduce((sum, t) => sum + t.amount, 0);
    // Filtrar transações de renda para este mês
    const monthlyIncome = transactions.filter(t => !('isInstallment' in t)).filter(t => {
      const transDate = new Date(t.date);
      return transDate.getMonth() === month && transDate.getFullYear() === year;
    }).reduce((sum, t) => sum + t.amount, 0);
    return {
      month: date.toLocaleDateString('pt-BR', {
        month: 'short'
      }),
      despesas: monthlyExpenses,
      rendas: monthlyIncome
    };
  });
  return <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{
        top: 10,
        right: 30,
        left: 0,
        bottom: 0
      }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={value => new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value)} />
          <Tooltip formatter={value => [new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(Number(value)), 'Valor']} />
          <Bar dataKey="rendas" name="Rendas" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>;
};