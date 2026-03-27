import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

function daysElapsed(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === y && today.getMonth() + 1 === m;
  if (isCurrentMonth) return today.getDate();
  return new Date(y, m, 0).getDate(); // dias no mês fechado
}

interface CardProps {
  label: string;
  value: string;
  sub: string;
  loading: boolean;
  highlight?: "up" | "down" | "neutral";
}

function Card({ label, value, sub, loading, highlight }: CardProps) {
  const valueColor =
    highlight === "up"
      ? "text-red-600"
      : highlight === "down"
      ? "text-emerald-600"
      : "text-gray-900";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-1">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      {loading ? (
        <div className="h-8 w-32 bg-gray-100 rounded animate-pulse" />
      ) : (
        <span className={`text-3xl font-bold ${valueColor}`}>{value}</span>
      )}
      <span className="text-xs text-gray-400">{sub}</span>
    </div>
  );
}

interface ExtraMetricsCardsProps {
  selectedMonth: string;
}

export default function ExtraMetricsCards({ selectedMonth }: ExtraMetricsCardsProps) {
  const prev = prevMonth(selectedMonth);

  const { data: month, isLoading: loadingMonth } = useQuery({
    queryKey: ["summary-month", selectedMonth],
    queryFn: () => api.summaryMonth(selectedMonth),
  });

  const { data: prevMonthData, isLoading: loadingPrev } = useQuery({
    queryKey: ["summary-month", prev],
    queryFn: () => api.summaryMonth(prev),
  });

  const { data: transactions, isLoading: loadingTx } = useQuery({
    queryKey: ["transactions", selectedMonth],
    queryFn: () => api.transactions({ month: selectedMonth, limit: 500 }),
  });

  // Média diária
  const elapsed = daysElapsed(selectedMonth);
  const avgDaily = month && elapsed > 0 ? month.total / elapsed : null;

  // Comparativo mês anterior
  let compareValue = "—";
  let compareHighlight: "up" | "down" | "neutral" = "neutral";
  let compareSub = "vs mês anterior";
  if (month && prevMonthData && prevMonthData.total > 0) {
    const pct = ((month.total - prevMonthData.total) / prevMonthData.total) * 100;
    const sign = pct >= 0 ? "▲" : "▼";
    compareValue = `${sign} ${Math.abs(pct).toFixed(1)}%`;
    compareHighlight = pct >= 0 ? "up" : "down";
    compareSub = `${formatBRL(month.total)} vs ${formatBRL(prevMonthData.total)}`;
  } else if (month && prevMonthData && prevMonthData.total === 0) {
    compareValue = "—";
    compareSub = "sem gastos no mês anterior";
  }

  // Maior gasto
  const biggest = transactions && transactions.length > 0
    ? transactions.reduce((a, b) => (a.amount > b.amount ? a : b))
    : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card
        label="Média diária"
        value={avgDaily !== null ? formatBRL(avgDaily) : "—"}
        sub={`baseado em ${elapsed} dia${elapsed !== 1 ? "s" : ""}`}
        loading={loadingMonth}
      />
      <Card
        label="vs mês anterior"
        value={compareValue}
        sub={compareSub}
        loading={loadingMonth || loadingPrev}
        highlight={compareHighlight}
      />
      <Card
        label="Maior gasto"
        value={biggest ? formatBRL(biggest.amount) : "—"}
        sub={biggest ? biggest.merchant : "nenhuma transação"}
        loading={loadingTx}
      />
    </div>
  );
}
