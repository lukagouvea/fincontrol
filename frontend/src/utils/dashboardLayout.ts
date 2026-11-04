export const dashboardWidgets = [
  { id: "upcoming-bills", title: "Contas do mês", span: 1, group: "overview" },
  {
    id: "recent-transactions",
    title: "Despesas recentes",
    span: 2,
    group: "overview",
  },
  { id: "weekly-calendar", title: "Sua semana", span: 2, group: "overview" },
  {
    id: "category-pie",
    title: "Gastos por categoria",
    span: 1,
    group: "overview",
  },
  {
    id: "weekly-spending",
    title: "Gastos nos últimos 7 dias",
    span: 1,
    group: "details",
  },
  {
    id: "expenses-histogram",
    title: "Distribuição dos gastos",
    span: 1,
    group: "details",
  },
  {
    id: "monthly-histogram",
    title: "Evolução do saldo mensal",
    span: 1,
    group: "details",
  },
];
export type DashboardWidget = (typeof dashboardWidgets)[number];
export function restoreDashboardLayout(
  saved: string | null,
): DashboardWidget[] {
  try {
    const parsed: unknown = saved ? JSON.parse(saved) : null;
    if (!Array.isArray(parsed)) return dashboardWidgets;
    const ids = parsed.map((item) =>
      typeof item === "object" && item !== null && "id" in item
        ? item.id
        : null,
    );
    const unique = [...new Set(ids)];
    const known = unique.flatMap((id) =>
      dashboardWidgets.filter((item) => item.id === id),
    );
    return [
      ...known,
      ...dashboardWidgets.filter((item) => !unique.includes(item.id)),
    ];
  } catch {
    return dashboardWidgets;
  }
}
