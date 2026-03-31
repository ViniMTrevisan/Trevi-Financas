import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string) {
  const [year, month] = dateStr.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
}

export default function InvestmentChart() {
  const { data: snapshots, isLoading } = useQuery({
    queryKey: ["investments"],
    queryFn: () => api.investments(),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-40 mb-4" />
        <div className="h-52 bg-gray-50 rounded" />
      </div>
    );
  }

  // Ordenar do mais antigo para o mais recente para o gráfico
  const sorted = [...(snapshots ?? [])].sort((a, b) =>
    a.snapshot_date.localeCompare(b.snapshot_date)
  );

  const chartData = sorted.map((s, i) => {
    const prev = i > 0 ? Number(sorted[i - 1].amount) : null;
    const curr = Number(s.amount);
    const growth = prev !== null ? curr - prev : null;
    return {
      date: formatDate(s.snapshot_date),
      amount: curr,
      growth,
    };
  });

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Evolução da carteira</h2>
        <p className="text-sm text-gray-400">Nenhum registro ainda. Use <code>/investimento</code> no bot para começar.</p>
      </div>
    );
  }

  const minVal = Math.min(...chartData.map((d) => d.amount));
  const yDomain: [number, number] = [Math.max(0, minVal * 0.97), "auto" as unknown as number];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Evolução da carteira</h2>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="investGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
            }
            width={52}
          />
          <Tooltip
            formatter={(value: number, _name: string, props) => {
              const entry = props.payload as { growth?: number | null };
              const growthLine =
                entry.growth != null
                  ? `\nVariação: ${entry.growth >= 0 ? "+" : ""}${fmt(entry.growth)}`
                  : "";
              return [`${fmt(value)}${growthLine}`, "Saldo"];
            }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#investGradient)"
            dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
