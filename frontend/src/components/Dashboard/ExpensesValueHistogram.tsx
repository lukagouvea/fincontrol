import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getActualFixedItemAmount } from '../../utils/financeUtils';
import { Transaction, MonthlyVariation } from '../../types/FinanceTypes';
type ExpensesValueHistogramProps = {
  transactions: Transaction[];
  monthlyVariations: MonthlyVariation[];
  date: Date;
};
export const ExpensesValueHistogram: React.FC<ExpensesValueHistogramProps> = ({
  transactions,
  monthlyVariations,
  date
}) => {

  // 1. Obter a data de hoje
  const hoje = date;

  // 2. Extrair o ano e o mês atual
  // getMonth() retorna o mês de 0 (Janeiro) a 11 (Dezembro), por isso somamos 1.
  const anoAtual = hoje.getFullYear(); // Ex: 2025
  const mesAtual = hoje.getMonth() + 1; // Ex: Para Outubro, retorna 10

  // 3. Formatar a string 'AAAA-MM' para garantir a comparação correta (com o zero à esquerda no mês)
  // padStart(2, '0') garante que o mês tenha sempre dois dígitos. Ex: 9 vira "09", 10 continua "10".
  const anoMesAtualString = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`; // Ex: "2025-10"


  // Filtrar apenas despesas
  const expenses = transactions.filter(t => t.type=='expense' && !t.recurringRuleId &&  t.date.startsWith(anoMesAtualString))
  .map(expense => ({
    ...expense,
    amount: !expense.recurringRuleId ? expense.amount : getActualFixedItemAmount(expense.id, 'expense', anoAtual, mesAtual-1, expense.amount, monthlyVariations)
  }))


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
  const data = generateHistogramData(expenses, 8);
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
          <Bar dataKey="quantidade" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>;
};