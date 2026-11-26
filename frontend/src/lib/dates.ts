export const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const shortMonths = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "Novembro de 2026". `month` é 0–11. */
export const monthLabel = (month: number, year: number) => `${monthNames[month]} de ${year}`;

/** Data local como 'YYYY-MM-DD'. */
export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** ISO UTC do backend → 'YYYY-MM-DD' no fuso local. */
export const isoToDateKey = (iso: string) => toDateKey(new Date(iso));

/** 'YYYY-MM-DD' → Date local à meia-noite. */
export const parseDateKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/** 'YYYY-MM-DD' → ISO UTC da meia-noite local (formato que o backend espera). */
export const dateKeyToIso = (key: string) => parseDateKey(key).toISOString();

export const shiftDateKey = (key: string, days: number) => {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

/** "14 nov" */
export const formatShortDate = (key: string) => {
  const date = parseDateKey(key);
  return `${date.getDate()} ${shortMonths[date.getMonth()]}`;
};

/** "14 de novembro" */
export const formatLongDate = (key: string) => {
  const date = parseDateKey(key);
  return `${date.getDate()} de ${monthNames[date.getMonth()].toLowerCase()}`;
};

/** "Hoje", "Ontem" ou "14 de novembro" (com ano se não for o ano de `today`). */
export function formatRelativeDay(key: string, today: string, { short = false } = {}) {
  if (key === today) return "Hoje";
  if (key === shiftDateKey(today, -1)) return "Ontem";
  if (key === shiftDateKey(today, 1)) return "Amanhã";
  const label = short ? formatShortDate(key) : formatLongDate(key);
  return key.slice(0, 4) === today.slice(0, 4) ? label : `${label} de ${key.slice(0, 4)}`;
}

export const shortMonthName = (month: number) => shortMonths[month];

/** Índice absoluto de mês (ano*12 + mês 0–11). */
export const monthIndex = (year: number, month: number) => year * 12 + month;
export const fromMonthIndex = (index: number) => ({ year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 });

export const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
