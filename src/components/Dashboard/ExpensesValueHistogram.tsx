import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../../context/FinanceContext';
type ExpensesValueHistogramProps = {
  transactions: Transaction[];
};
export const ExpensesValueHistogram: React.FC<ExpensesValueHistogramProps> = ({
  transactions
}) => {
  // Filtrar apenas despesas
  const expenses = transactions.filter(t => 'isInstallment' in t);


  const generateHistogramData = (expenses: Transaction[], numRanges: number = 6) => {
    // Se não houver despesas, retorna um array vazio
    if (expenses.length === 0) {
      return [];
    }

    // 1. Encontrar os valores mínimo e máximo
    const amounts = expenses.map(e => e.amount);
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);

    // Caso especial: se todos os valores forem iguais
    if (minAmount === maxAmount) {
      return [{
        range: `R$ ${minAmount.toFixed(2)}`,
        quantidade: expenses.length
      }];
    }

    // 2. Calcular a amplitude de cada faixa
    const rangeWidth = (maxAmount - minAmount) / numRanges;

    // 3. Gerar as faixas dinamicamente
    const ranges = Array.from({ length: numRanges }, (_, i) => {
      const rangeMin = minAmount + (i * rangeWidth);
      const rangeMax = minAmount + ((i + 1) * rangeWidth);
      return {
        min: rangeMin,
        max: rangeMax,
        // Formata o rótulo para ficar mais legível
        label: `R$ ${Math.round(rangeMin)} - ${Math.round(rangeMax)}`
      };
    });
    // 4. Agrupar despesas por faixa de valor (semelhante ao seu código original)
    const histogramData = ranges.map((range, index) => {
      const count = expenses.filter(expense => {
        // Para a última faixa, inclui o valor máximo
        if (index === numRanges - 1) {
          return expense.amount >= range.min && expense.amount <= range.max;
        }
        return expense.amount >= range.min && expense.amount < range.max;
      }).length;

      return {
        range: range.label,
        quantidade: count
      };
    });

    return histogramData;
  };

  // Agrupar despesas por faixa de valor
  const data = generateHistogramData(expenses, 10);
  return <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{
        top: 10,
        right: 30,
        left: 0,
        bottom: 5
      }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="range" />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={value => [`${value} transações`, 'Quantidade']} />
          <Bar dataKey="quantidade" fill="#9333ea" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>;
};