import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface CardProps {
  label: string;
  value: string;
  sub: string;
  loading: boolean;
}

function Card({ label, value, sub, loading }: CardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-1">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      {loading ? (
        <div className="h-8 w-32 bg-gray-100 rounded animate-pulse" />
      ) : (
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      )}
      <span className="text-xs text-gray-400">{sub}</span>
    </div>
  );
}

interface SummaryCardsProps {
  selectedMonth: string;
}

export default function SummaryCards({ selectedMonth }: SummaryCardsProps) {
  const { data: today, isLoading: loadingToday } = useQuery({
    queryKey: ["summary-today"],
    queryFn: api.summaryToday,
  });

  const { data: month, isLoading: loadingMonth } = useQuery({
    queryKey: ["summary-month", selectedMonth],
    queryFn: () => api.summaryMonth(selectedMonth),
  });

  const todayDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });

  const [year, m] = selectedMonth.split("-");
  const monthLabel = new Date(Number(year), Number(m) - 1).toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric" }
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card
        label="Hoje"
        value={today ? formatBRL(today.total) : "—"}
        sub={`${today?.count ?? "—"} transações em ${todayDate}`}
        loading={loadingToday}
      />
      <Card
        label="Mês atual"
        value={month ? formatBRL(month.total) : "—"}
        sub={`${month?.count ?? "—"} transações em ${monthLabel}`}
        loading={loadingMonth}
      />
    </div>
  );
}
