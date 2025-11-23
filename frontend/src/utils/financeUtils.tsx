import { MonthlyVariation, Parcela } from "../types/FinanceTypes";


export const generateParcelas = (valorTotal: number, numeroParcelas: number, description:string, date:string, categoryId:string) => {
    // 1. Validação dos dados de entrada
    if (valorTotal <= 0 || numeroParcelas <= 0) {
        throw new Error("O valor total e o número de parcelas devem ser positivos.");
    }
    if (!Number.isInteger(numeroParcelas)) {
        throw new Error("O número de parcelas deve ser um inteiro.");
    }

    // 2. Converter o valor total para centavos para trabalhar com inteiros
    const valorTotalEmCentavos = Math.round(valorTotal * 100);

    // 3. Calcular o valor base de cada parcela e o resto da divisão
    const valorBaseParcelaEmCentavos = Math.floor(valorTotalEmCentavos / numeroParcelas);
    const restoEmCentavos = valorTotalEmCentavos % numeroParcelas;

    const parcelas : Omit<Parcela, 'id'>[] = [];
    const baseDate = new Date(date);
    // 4. Gerar as parcelas, distribuindo o resto
    for (let i = 0; i < numeroParcelas; i++) {
        let valorDaParcela = valorBaseParcelaEmCentavos;
        // Adiciona 1 centavo às primeiras parcelas para distribuir o resto
        if (i < restoEmCentavos) {
        valorDaParcela += 1;
        }
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(baseDate.getMonth() + i);
        // 5. Converte o valor de volta para decimal e adiciona ao array
        parcelas.push({
        description: description,
        amount: valorDaParcela/100,
        date: installmentDate.toISOString(),
        categoryId: categoryId,
        isInstallment: true,
        installmentInfo: {
            total: numeroParcelas,
            current: i+1
        }
        } as Omit<Parcela, 'id'>);
    }

    return parcelas;
    }

export const getActualFixedItemAmount = (itemId: string, type: 'income' | 'expense', year: number, month: number, defaultAmount: number, monthlyVariations: MonthlyVariation[]): number => {
    const variation = monthlyVariations.find(v => v.fixedItemId === itemId && v.type === type && v.year === year && v.month === month);
    return variation ? variation.amount : defaultAmount;
  };

/**
 * Verifica se um item recorrente (com dia de vencimento) está ativo em um determinado mês.
 * A verificação é feita contra a data exata da ocorrência no mês-alvo.
 * @param item Objeto com 'day', 'startDate' (string UTC) e 'endDate' opcional (string UTC).
 * @param targetDate Objeto Date representando o mês e ano a ser verificado.
 * @returns 'true' se o item estiver ativo, 'false' caso contrário.
 */
export const isItemActiveInMonth = (
  item: { day: number; startDate: string; endDate?: string | null },
  targetDate: Date
): boolean => {
  // 1. Cria a data exata da ocorrência para o mês e ano alvo.
  // Ex: Se targetDate é Outubro/2025 e item.day é 10, cria a data "10/10/2025".
  const occurrenceDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), item.day);

  // 2. Converte as datas de início e fim (que estão em UTC) para objetos Date.
  const startDate = new Date(item.startDate);
  const endDate = item.endDate ? new Date(item.endDate) : null;

  // 3. Zera as horas de todas as datas para uma comparação justa, ignorando o tempo.
  occurrenceDate.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate?.setHours(0, 0, 0, 0);

  // 4. Verifica se a data de ocorrência está dentro do intervalo válido.
  const isAfterStart = occurrenceDate >= startDate;
  const isBeforeEnd = !endDate || occurrenceDate <= endDate;

  return isAfterStart && isBeforeEnd;
};