import type {
  Transaction,
  FixedIncome,
  FixedExpense,
  MonthlyVariation,
  Category,
} from "../types/FinanceTypes";
import { parseDateInputToLocal } from "./dateUtils";
import { isItemActiveInMonth, getActualFixedItemAmount } from "./financeUtils";

// Calculations extracted unchanged from main's monthly report.
export function buildMonthlyReport(
  selectedDateObject: Date,
  transactions: Transaction[],
  fixedIncomes: FixedIncome[],
  fixedExpenses: FixedExpense[],
  categories: Category[],
  monthlyVariations: MonthlyVariation[],
) {
  const anoAtual = selectedDateObject.getFullYear();
  const mesAtual = selectedDateObject.getMonth(); // 0-11

  // Helper para gerar string de data para itens fixos naquele mês
  const getFixedItemDate = (day: number) => {
    const month = String(mesAtual + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    // Monta o ISO local manualmente YYYY-MM-DDTHH:mm:ss
    return `${anoAtual}-${month}-${d}T00:00:00.000`;
  };

  // --- 1. PROCESSAMENTO DE RENDAS ---
  const variableIncomes = transactions.filter((t) => {
    const tDate = parseDateInputToLocal(t.date.split("T")[0]);
    const isSameMonth =
      tDate.getMonth() === mesAtual && tDate.getFullYear() === anoAtual;
    const isIncome = t.type === "income";
    const isNotFixedVariation = !t.recurringRuleId; // Não inclui variações de fixas
    return isSameMonth && isIncome && isNotFixedVariation;
  });

  const fixedIncomesList = fixedIncomes
    .filter((income) => isItemActiveInMonth(income, selectedDateObject))
    .map((income) => ({
      ...income,
      date: getFixedItemDate(income.day),
      actualAmount: getActualFixedItemAmount(
        income.id,
        "income",
        anoAtual,
        mesAtual,
        income.amount,
        monthlyVariations,
      ),
      type: "income" as const,
    }));

  const totalVariableIncome = variableIncomes.reduce(
    (sum, t) => sum + Number(t.amount),
    0,
  );
  const totalFixedIncome = fixedIncomesList.reduce(
    (sum, t) => sum + Number(t.actualAmount),
    0,
  );
  const totalIncome = totalVariableIncome + totalFixedIncome;

  // Agrupamento de Rendas por Categoria
  const groupedIncomes = categories
    .filter((cat) => cat.type === "income")
    .map((category) => {
      const catVariable = variableIncomes.filter(
        (t) => t.categoryId === category.id,
      );
      const catFixed = fixedIncomesList.filter(
        (t) => t.categoryId === category.id,
      );

      const totalVar = catVariable.reduce(
        (sum, t) => sum + Number(t.amount),
        0,
      );
      const totalFix = catFixed.reduce(
        (sum, t) => sum + Number(t.actualAmount),
        0,
      );

      return {
        category,
        total: totalVar + totalFix,
        count: catVariable.length + catFixed.length,
        fixedCount: catFixed.length,
        variableCount: catVariable.length,
      };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  // --- 2. PROCESSAMENTO DE DESPESAS ---
  const variableExpenses = transactions.filter((t) => {
    const tDate = parseDateInputToLocal(t.date.split("T")[0]);
    const isSameMonth =
      tDate.getMonth() === mesAtual && tDate.getFullYear() === anoAtual;
    const isExpense = t.type === "expense";
    // Inclui parcelas e avulsas, mas exclui variações de fixas
    const isNotFixedVariation = !t.recurringRuleId;
    return isSameMonth && isExpense && isNotFixedVariation;
  });

  const fixedExpensesList = fixedExpenses
    .filter((expense) => isItemActiveInMonth(expense, selectedDateObject))
    .map((expense) => ({
      ...expense,
      date: getFixedItemDate(expense.day),
      actualAmount: getActualFixedItemAmount(
        expense.id,
        "expense",
        anoAtual,
        mesAtual,
        expense.amount,
        monthlyVariations,
      ),
      type: "expense" as const,
    }));

  const totalVariableExpense = variableExpenses.reduce(
    (sum, t) => sum + Number(t.amount),
    0,
  );
  const totalFixedExpense = fixedExpensesList.reduce(
    (sum, t) => sum + Number(t.actualAmount),
    0,
  );
  const totalExpense = totalVariableExpense + totalFixedExpense;

  // Lista unificada para gráficos (normalizando fixedExpenses para parecer transactions)
  const fixedExpensesNormalized = fixedExpensesList.map((f) => ({
    id: f.id,
    description: f.description,
    amount: f.actualAmount,
    date: f.date,
    categoryId: f.categoryId,
    type: "expense" as const,
    isInstallment: false,
  }));

  const allExpensesForCharts = [
    ...variableExpenses,
    ...fixedExpensesNormalized,
  ];

  // Agrupamento de Despesas por Categoria
  const groupedExpenses = categories
    .filter((cat) => cat.type === "expense")
    .map((category) => {
      const catVariable = variableExpenses.filter(
        (t) => t.categoryId === category.id,
      );
      const catFixed = fixedExpensesList.filter(
        (t) => t.categoryId === category.id,
      );

      const totalVar = catVariable.reduce(
        (sum, t) => sum + Number(t.amount),
        0,
      );
      const totalFix = catFixed.reduce(
        (sum, t) => sum + Number(t.actualAmount),
        0,
      );

      return {
        category,
        total: totalVar + totalFix,
        count: catVariable.length + catFixed.length,
        fixedCount: catFixed.length,
        variableCount: catVariable.length,
      };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  return {
    monthlyIncomeData: {
      variable: variableIncomes,
      fixed: fixedIncomesList,
      sorted: [...variableIncomes, ...fixedIncomesList].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    },
    monthlyExpenseData: {
      variable: variableExpenses,
      fixed: fixedExpensesList,
      sorted: [...variableExpenses, ...fixedExpensesList].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
      allForCharts: allExpensesForCharts,
    },
    totals: {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
    },
    incomesByCategory: groupedIncomes,
    expensesByCategory: groupedExpenses,
  };
}
