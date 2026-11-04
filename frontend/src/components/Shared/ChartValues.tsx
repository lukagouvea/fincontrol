import { formatMoney } from "./UI";

export function ChartValues({
  rows,
  count = false,
}: {
  rows: { label: string; value: number }[];
  count?: boolean;
}) {
  return (
    <details className="chart-values">
      <summary>Ver valores do gráfico</summary>
      <dl>
        {rows.map((row, index) => (
          <div key={row.label + index}>
            <dt>{row.label}</dt>
            <dd>
              {count
                ? row.value + (row.value === 1 ? " gasto" : " gastos")
                : formatMoney(row.value)}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
