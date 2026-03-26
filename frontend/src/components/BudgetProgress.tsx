import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function progressColor(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-400";
  return "bg-emerald-500";
}

interface BudgetProgressProps {
  selectedMonth: string;
}

export default function BudgetProgress({ selectedMonth }: BudgetProgressProps) {
  const { data: budgets, isLoading: loadingBudgets } = useQuery({
    queryKey: ["budgets"],
    queryFn: api.budgets,
  });

  const { data: spending, isLoading: loadingSpending } = useQuery({
    queryKey: ["categories", selectedMonth],
    queryFn: () => api.categories(selectedMonth),
  });

  if (loadingBudgets || loadingSpending) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm font-medium text-gray-500 mb-4">Metas por categoria</p>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!budgets || budgets.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm font-medium text-gray-500 mb-2">Metas por categoria</p>
        <p className="text-sm text-gray-400">
          Nenhuma meta definida. Use <code className="bg-gray-100 px-1 rounded text-xs">/metas Alimentação 800</code> no bot.
        </p>
      </div>
    );
  }

  const spendingMap = Object.fromEntries(
    (spending ?? []).map((s) => [s.category, s.total])
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm font-medium text-gray-500 mb-5">Metas por categoria</p>
      <div className="space-y-4">
        {budgets.map((b) => {
          const spent = spendingMap[b.category] ?? 0;
          const pct = Math.min((spent / b.monthly_limit) * 100, 100);
          const color = progressColor(pct);

          return (
            <div key={b.category}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-medium text-gray-700">{b.category}</span>
                <span className="text-xs text-gray-500">
                  {formatBRL(spent)}{" "}
                  <span className="text-gray-300">/</span>{" "}
                  {formatBRL(b.monthly_limit)}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-right text-xs text-gray-400 mt-0.5">{pct.toFixed(0)}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
