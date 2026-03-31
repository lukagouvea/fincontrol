import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../../types/FinanceTypes';
import { areSameDay } from '../../utils/dateUtils';
type WeeklySpendingProps = {
  transactions: Transaction[];
};
export const WeeklySpending: React.FC<WeeklySpendingProps> = ({
  transactions
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 shadow-md rounded">
          <p className="text-black dark:text-white font-medium mb-1">{label}</p>
          <p className="text-blue-500">
            Valor : {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(payload[0].value))}
          </p>
        </div>
      );
    }
    return null;
  };

  // Obter as datas dos últimos 7 dias
  const today = new Date();
  const last7Days = Array.from({
    length: 7
  }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    return date;
  }).reverse();

  // Formatar os dados para o gráfico
  const data = last7Days.map(date => {
    // Filtrar transações apenas de despesa para esta data
    const dailyExpenses = transactions.filter(t => t.type=='expense').filter(t => areSameDay(t.date, date)).reduce((sum, t) => sum + t.amount, 0);
    return {
      date: date.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: 'numeric'
      }),
      valor: dailyExpenses
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
          <XAxis dataKey="date" />
          <YAxis tickFormatter={value => new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value)} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.2)' }} />
          <Bar dataKey="valor" fill="#2363eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>;
};