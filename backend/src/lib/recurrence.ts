// Regras puras de vigência das regras recorrentes. Meses são representados
// como um índice inteiro (ano * 12 + mês 0-11) para evitar problemas de fuso.

export type VersionValues = {
  amount: number;
  categoryId: string | null;
  dayOfMonth: number;
};

export type Version = VersionValues & {
  /** Índice do mês em que a versão passa a valer. */
  effectiveFrom: number;
};

export type VersionScope = 'from' | 'all';

export const monthIndex = (year: number, month: number) => year * 12 + month;

/** Índice do mês de uma data, lido em UTC (colunas DATE e timestamps em UTC). */
export const monthIndexOfDate = (date: Date) =>
  monthIndex(date.getUTCFullYear(), date.getUTCMonth());

export const yearMonthOf = (index: number) => ({
  year: Math.floor(index / 12),
  month: ((index % 12) + 12) % 12,
});

/** Primeiro dia do mês, à meia-noite UTC (formato das colunas DATE). */
export const dateOfMonthIndex = (index: number) => {
  const { year, month } = yearMonthOf(index);
  return new Date(Date.UTC(year, month, 1));
};

/** Converte 'YYYY-MM' em índice de mês. */
export const parseMonthKey = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  return monthIndex(year, month - 1);
};

export const formatMonthKey = (index: number) => {
  const { year, month } = yearMonthOf(index);
  return `${year}-${String(month + 1).padStart(2, '0')}`;
};

export const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/** Dia 31 em um mês de 30 dias vira 30; em fevereiro, 28 ou 29. */
export const clampDay = (year: number, month: number, day: number) =>
  Math.min(day, daysInMonth(year, month));

/** Data (meia-noite UTC) da ocorrência de uma regra em um mês. */
export const occurrenceDate = (index: number, day: number) => {
  const { year, month } = yearMonthOf(index);
  return new Date(Date.UTC(year, month, clampDay(year, month, day)));
};

const byMonth = (a: Version, b: Version) => a.effectiveFrom - b.effectiveFrom;

const sameValues = (a: VersionValues, b: VersionValues) =>
  a.amount === b.amount &&
  a.categoryId === b.categoryId &&
  a.dayOfMonth === b.dayOfMonth;

/**
 * Versão vigente em um mês: a mais recente com effectiveFrom <= mês.
 * Meses anteriores à primeira versão usam a primeira.
 */
export function versionForMonth<T extends Version>(versions: T[], index: number): T {
  if (!versions.length) throw new Error('Regra recorrente sem versões');
  const sorted = [...versions].sort(byMonth);
  let current = sorted[0];
  for (const v of sorted) {
    if (v.effectiveFrom <= index) current = v;
    else break;
  }
  return current;
}

/**
 * Normaliza a lista de versões: ordena, garante que a primeira comece no mês
 * de início da regra (versões anteriores ao início são absorvidas) e junta
 * versões consecutivas com os mesmos valores.
 */
export function normalizeVersions(versions: Version[], startIndex: number): Version[] {
  const sorted = [...versions].sort(byMonth);
  const base = versionForMonth(sorted, startIndex);
  const result: Version[] = [{ ...base, effectiveFrom: startIndex }];
  for (const v of sorted) {
    if (v.effectiveFrom <= startIndex) continue;
    const last = result[result.length - 1];
    if (!sameValues(last, v)) result.push({ ...v });
  }
  return result;
}

/**
 * Calcula a lista de versões depois de uma edição.
 * - 'from': os campos alterados valem do mês `fromIndex` em diante; os meses
 *   anteriores ficam como estavam.
 * - 'all': as mudanças são aplicadas a todas as versões (correção do histórico).
 */
export function planVersions(
  versions: Version[],
  changes: Partial<VersionValues>,
  scope: VersionScope,
  fromIndex: number,
  startIndex: number,
): Version[] {
  const defined = Object.fromEntries(
    Object.entries(changes).filter(([, v]) => v !== undefined),
  ) as Partial<VersionValues>;

  if (scope === 'all') {
    return normalizeVersions(
      versions.map((v) => ({ ...v, ...defined })),
      startIndex,
    );
  }

  const from = Math.max(fromIndex, startIndex);
  const base = versionForMonth(versions, from);
  const before = versions.filter((v) => v.effectiveFrom < from);
  // Versões posteriores mantêm os campos que não foram alterados (ex.: mudar a
  // categoria não apaga um reajuste de valor já agendado), mas os campos
  // alterados passam a valer em todos os meses a partir de `from`.
  const after = versions
    .filter((v) => v.effectiveFrom > from)
    .map((v) => ({ ...v, ...defined }));
  return normalizeVersions(
    [...before, { ...base, ...defined, effectiveFrom: from }, ...after],
    startIndex,
  );
}
