import { FixedVersion, MonthlyVariation, Parcela } from "../types/FinanceTypes";


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

type FixedItemLike = {
  day: number;
  pausedFrom?: string | null;
  pausedUntil?: string | null;
  startDate: string;
  endDate?: string | null;
  amount?: number;
  categoryId?: string | null;
  cardId?: string | null;
  versions?: FixedVersion[];
};

export type FixedItemValues = {
  amount: number;
  categoryId: string | null;
  day: number;
  /** Forma de pagamento vigente no mês (null = À vista). */
  cardId: string | null;
};

const monthIndex = (year: number, month: number) => year * 12 + month;

/** 'YYYY-MM-01' -> índice do mês, sem passar por Date (evita fuso). */
const versionMonthIndex = (effectiveFrom: string) => {
  const [year, month] = effectiveFrom.split("-").map(Number);
  return monthIndex(year, month - 1);
};

/** Dia 31 em meses curtos vira o último dia do mês, sem transbordar para o seguinte. */
export const clampDay = (year: number, month: number, day: number) =>
  Math.min(day, new Date(year, month + 1, 0).getDate());

/**
 * Valores (valor padrão, categoria e dia) vigentes de um item fixo em um mês:
 * a versão mais recente com início até aquele mês. Itens sem `versions` usam
 * os campos de topo.
 */
export const getFixedItemVersion = (
  item: FixedItemLike,
  year: number,
  month: number,
): FixedItemValues => {
  const fallback = {
    amount: item.amount ?? 0,
    categoryId: item.categoryId ?? null,
    day: item.day,
    cardId: item.cardId ?? null,
  };
  if (!item.versions?.length) return fallback;
  const target = monthIndex(year, month);
  const sorted = [...item.versions].sort(
    (a, b) => versionMonthIndex(a.effectiveFrom) - versionMonthIndex(b.effectiveFrom),
  );
  let current = sorted[0];
  for (const v of sorted) {
    if (versionMonthIndex(v.effectiveFrom) <= target) current = v;
    else break;
  }
  // Versões de antes do cartão versionado não trazem cardId: usa o da regra.
  const cardId = current.cardId === undefined ? fallback.cardId : current.cardId ?? null;
  return { amount: current.amount, categoryId: current.categoryId ?? null, day: current.day, cardId };
};

export const getActualFixedItemAmount = (
  item: FixedItemLike & { id: string },
  type: 'income' | 'expense',
  year: number,
  month: number,
  monthlyVariations: MonthlyVariation[],
): number => {
  const variation = monthlyVariations.find(v => v.fixedItemId === item.id && v.type === type && v.year === year && v.month === month);
  return variation ? variation.amount : getFixedItemVersion(item, year, month).amount;
};

/**
 * Verifica se um item recorrente (com dia de vencimento) está ativo em um determinado mês.
 * A verificação é feita contra a data exata da ocorrência no mês-alvo, usando
 * o dia da versão vigente naquele mês.
 * @param item Objeto com 'day', 'startDate' (string UTC) e 'endDate' opcional (string UTC).
 * @param targetDate Objeto Date representando o mês e ano a ser verificado.
 * @returns 'true' se o item estiver ativo, 'false' caso contrário.
 */
export const isItemActiveInMonth = (
  item: FixedItemLike,
  targetDate: Date
): boolean => {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  // Pausada nesse mês: não lança.
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  if (item.pausedFrom && key >= item.pausedFrom && key <= (item.pausedUntil ?? item.pausedFrom)) return false;
  const { day } = getFixedItemVersion(item, year, month);
  // 1. Cria a data exata da ocorrência para o mês e ano alvo.
  // Ex: Se targetDate é Outubro/2025 e o dia é 10, cria a data "10/10/2025".
  const occurrenceDate = new Date(year, month, clampDay(year, month, day));

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

export type ResolvedFixedItem = FixedItemValues & {
  /** Valor efetivo do mês (variação, se houver; senão o valor da versão). */
  actualAmount: number;
  hasVariation: boolean;
  /** Dia efetivo da ocorrência no mês (já ajustado para meses curtos). */
  occurrenceDay: number;
};

/**
 * Resolve um item fixo para um mês: valores da versão vigente, variação e dia
 * da ocorrência. Retorna null se o item não estiver ativo no mês.
 */
export const resolveFixedItemForMonth = (
  item: FixedItemLike & { id: string },
  type: 'income' | 'expense',
  year: number,
  month: number,
  monthlyVariations: MonthlyVariation[],
): ResolvedFixedItem | null => {
  if (!isItemActiveInMonth(item, new Date(year, month, 1))) return null;
  const version = getFixedItemVersion(item, year, month);
  const variation = monthlyVariations.find(
    (v) => v.fixedItemId === item.id && v.type === type && v.year === year && v.month === month,
  );
  return {
    ...version,
    actualAmount: variation ? variation.amount : version.amount,
    hasVariation: !!variation,
    occurrenceDay: clampDay(year, month, version.day),
  };
};
