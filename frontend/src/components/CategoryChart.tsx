import { useQuery } from "@tanstack/react-query";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { api } from "../api/client";

const COLORS = [
  "#6366f1", // Alimentação
  "#22c55e", // Mercado
  "#f59e0b", // Transporte
  "#ef4444", // Saúde
  "#8b5cf6", // Lazer
  "#14b8a6", // Serviços
  "#94a3b8", // Outro
];

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface CategoryChartProps {
  selectedMonth: string;
}

export default function CategoryChart({ selectedMonth }: CategoryChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["categories", selectedMonth],
    queryFn: () => api.categories(selectedMonth),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm font-medium text-gray-500 mb-4">Por categoria</p>
        <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm font-medium text-gray-500 mb-4">Por categoria</p>
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          Nenhuma transação neste mês.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm font-medium text-gray-500 mb-4">Por categoria</p>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={90}
            strokeWidth={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatBRL(value)}
            labelFormatter={(label) => String(label)}
          />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-gray-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
