import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getActualFixedItemAmount } from '../../utils/financeUtils';
import { Transaction, MonthlyVariation } from '../../types/FinanceTypes';

type ExpensesValueHistogramProps = {
  transactions: Transaction[];
  monthlyVariations: MonthlyVariation[];
  date: Date;
};

// Função auxiliar para calcular percentis (necessário para achar a "massa" dos dados)
const getQuantile = (array: number[], quantile: number) => {
  const sorted = [...array].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * quantile;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
};

export const ExpensesValueHistogram: React.FC<ExpensesValueHistogramProps> = ({
  transactions,
  monthlyVariations,
  date
}) => {
  const hoje = date;
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  const anoMesAtualString = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`;

  const expenses = transactions
    .filter(t => t.type === 'expense' && !t.recurringRuleId && t.date.startsWith(anoMesAtualString))
    .map(expense => ({
      ...expense,
      amount: !expense.recurringRuleId 
        ? expense.amount 
        : getActualFixedItemAmount(expense.id, 'expense', anoAtual, mesAtual - 1, expense.amount, monthlyVariations)
    }));

  const generateHistogramData = (data: typeof expenses) => {
    if (data.length === 0) return [];

    const amounts = data.map(e => e.amount).sort((a, b) => a - b);

    // --- LÓGICA ESTATÍSTICA ---
    
    // 1. Calcular Quartis e IQR (Intervalo Interquartil)
    // Isso serve para identificar onde está a "maioria normal" dos seus gastos
    const q1 = getQuantile(amounts, 0.25);
    const q3 = getQuantile(amounts, 0.75);
    const iqr = q3 - q1;

    // 2. Definir Limites (Cutoff)
    // Removemos o que estiver muito longe da média (ex: um gasto único gigante que estraga o gráfico)
    // Usamos 1.5 * IQR, que é o padrão estatístico para detectar outliers leves
    let minRange = Math.max(0, q1 - 1.5 * iqr); 
    const maxRange = q3 + 1.5 * iqr;

    // Filtramos apenas os dados que caem dentro dessa "curva normal" para gerar as barras
    // (Opcional: você pode querer incluir tudo, mas isso "achata" a curva. Para ver a normal, filtramos).
    const filteredAmounts = amounts.filter(a => a >= minRange && a <= maxRange);

    if (filteredAmounts.length === 0) return []; // Fallback se o filtro for agressivo demais

    // 3. Calcular largura do Bin usando Freedman-Diaconis
    // Formula: Width = 2 * IQR / (n ^ 1/3)
    const n = filteredAmounts.length;
    // Se o IQR for 0 (todos gastos iguais), força um bin width padrão
    const iqrFiltered = (getQuantile(filteredAmounts, 0.75) - getQuantile(filteredAmounts, 0.25)) || 10;
    
    let binWidth = (2 * iqrFiltered) / Math.pow(n, (1/3));
    
    // Proteção contra binWidth zero ou infinito
    if (binWidth <= 0 || !isFinite(binWidth)) binWidth = (maxRange - minRange) / 10 || 10;

    // Calcular número de bins sugerido
    let numBins = Math.ceil((maxRange - minRange) / binWidth);

    // Clamp: Forçar entre 5 e 20 barras para não ficar nem muito pobre nem muito poluido visualmente
    numBins = Math.max(5, Math.min(20, numBins));

    // Recalcular largura exata baseada no número de bins travado
    const finalBinWidth = (maxRange - minRange) / numBins;

    // --- GERAÇÃO DAS BARRAS ---

    const ranges = Array.from({ length: numBins }, (_, i) => {
      const start = minRange + (i * finalBinWidth);
      const end = start + finalBinWidth;
      return {
        min: start,
        max: end,
        label: `R$${Math.round(start)}-${Math.round(end)}`
      };
    });

    const histogramData = ranges.map((range, index) => {
      const count = filteredAmounts.filter(amount => {
        // Inclui o limite superior apenas no último bin
        if (index === numBins - 1) return amount >= range.min && amount <= range.max;
        return amount >= range.min && amount < range.max;
      }).length;

      return {
        range: range.label,
        quantidade: count,
        // Dados extras para tooltip se quiser saber o range exato
        min: range.min, 
        max: range.max
      };
    });

    return histogramData;
  };

  const data = generateHistogramData(expenses);

  return (
    <div className="h-64">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
            barCategoryGap={1} // Diminui o espaço entre barras para parecer mais um histograma contínuo
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="range" 
              tick={{fontSize: 10}} 
              interval={0} // Tenta mostrar todos, ou ajuste para 'preserveStartEnd'
              angle={-45} // Inclina se ficar muito apertado
              textAnchor="end"
              height={50}
            />
            <YAxis allowDecimals={false} />
            <Tooltip 
              cursor={{fill: 'transparent'}}
              formatter={(value) => [`${value} gastos`, 'Frequência']}
              labelStyle={{ color: 'black' }}
            />
            <Bar dataKey="quantidade" fill="#2563eb" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          Dados insuficientes para histograma neste mês.
        </div>
      )}
    </div>
  );
};