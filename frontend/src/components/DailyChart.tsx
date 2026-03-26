import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDay(dateStr: string) {
  // "2026-03-15" → "15"
  return dateStr.split("-")[2];
}

interface DailyChartProps {
  selectedMonth: string;
}

export default function DailyChart({ selectedMonth }: DailyChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["summary-month", selectedMonth],
    queryFn: () => api.summaryMonth(selectedMonth),
    select: (d) => d.daily,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm font-medium text-gray-500 mb-4">Gasto por dia</p>
        <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm font-medium text-gray-500 mb-4">Gasto por dia</p>
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          Nenhuma transação neste mês.
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    day: formatDay(d.date),
    total: d.total,
  }));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm font-medium text-gray-500 mb-4">Gasto por dia</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} barSize={18}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `R$${v}`}
            width={55}
          />
          <Tooltip
            formatter={(value: number) => [formatBRL(value), "Total"]}
            labelFormatter={(label) => `Dia ${label}`}
            cursor={{ fill: "#f8fafc" }}
          />
          <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
