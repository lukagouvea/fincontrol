export const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** "Novembro de 2026". `month` é 0–11. */
export const monthLabel = (month: number, year: number) => `${monthNames[month]} de ${year}`;
