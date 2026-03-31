import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function GrowthBadge({ value, pct }: { value: number | null; pct: number | null }) {
  if (value === null || pct === null) return <span className="text-gray-400 text-sm">—</span>;
  const positive = value >= 0;
  const color = positive ? "text-emerald-600" : "text-red-500";
  const sign = positive ? "+" : "";
  return (
    <span className={`text-sm font-medium ${color}`}>
      {sign}{fmt(value)} ({sign}{pct.toFixed(1)}%)
    </span>
  );
}

export default function InvestmentCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["investment-summary"],
    queryFn: () => api.investmentSummary(),
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-24 mb-3" />
            <div className="h-7 bg-gray-100 rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Saldo atual",
      value: data.latest_amount !== null ? fmt(data.latest_amount) : "—",
      sub: data.snapshots_count > 0 ? `${data.snapshots_count} registro(s)` : "Nenhum registro",
    },
    {
      label: "Crescimento (período)",
      value: <GrowthBadge value={data.growth_abs} pct={data.growth_pct} />,
      sub: data.previous_amount !== null ? `Anterior: ${fmt(data.previous_amount)}` : "Primeiro registro",
    },
    {
      label: "Crescimento total",
      value: <GrowthBadge value={data.total_growth_abs} pct={data.total_growth_pct} />,
      sub: "Desde o primeiro registro",
    },
    {
      label: "Registros",
      value: String(data.snapshots_count),
      sub: data.snapshots_count > 0 ? "snapshots mensais" : "Registre no dia 10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{card.label}</p>
          <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
