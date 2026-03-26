import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";

const CATEGORIES = [
  "Alimentação",
  "Mercado",
  "Transporte",
  "Saúde",
  "Lazer",
  "Serviços",
  "Outro",
];

const CATEGORY_COLORS: Record<string, string> = {
  Alimentação: "bg-indigo-100 text-indigo-700",
  Mercado: "bg-green-100 text-green-700",
  Transporte: "bg-amber-100 text-amber-700",
  Saúde: "bg-red-100 text-red-700",
  Lazer: "bg-violet-100 text-violet-700",
  Serviços: "bg-teal-100 text-teal-700",
  Outro: "bg-gray-100 text-gray-600",
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

interface TransactionsTableProps {
  selectedMonth: string;
}

export default function TransactionsTable({
  selectedMonth,
}: TransactionsTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", selectedMonth, categoryFilter],
    queryFn: () =>
      api.transactions({
        month: selectedMonth,
        category: categoryFilter || undefined,
        limit: 100,
      }),
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <p className="text-sm font-medium text-gray-500 flex-1">Transações</p>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Todas as categorias</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          Nenhuma transação encontrada.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-3 font-medium">Data</th>
                <th className="pb-3 font-medium">Estabelecimento</th>
                <th className="pb-3 font-medium">Categoria</th>
                <th className="pb-3 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 text-gray-500">
                    {formatDate(tx.transaction_date)}
                  </td>
                  <td className="py-3 text-gray-900 font-medium">
                    {tx.merchant}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        CATEGORY_COLORS[tx.category] ?? CATEGORY_COLORS["Outro"]
                      }`}
                    >
                      {tx.category}
                    </span>
                  </td>
                  <td className="py-3 text-right font-semibold text-gray-900">
                    {formatBRL(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
