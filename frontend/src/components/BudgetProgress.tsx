import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newLimit, setNewLimit] = useState<string>("");
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  const { data: budgets, isLoading: loadingBudgets } = useQuery({
    queryKey: ["budgets"],
    queryFn: api.budgets,
  });

  const { data: spending, isLoading: loadingSpending } = useQuery({
    queryKey: ["categories", selectedMonth],
    queryFn: () => api.categories(selectedMonth),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["budgets"] });

  const upsertMutation = useMutation({
    mutationFn: ({ category, limit }: { category: string; limit: number }) =>
      api.updateBudget(category, limit),
    onSuccess: () => {
      invalidate();
      setEditingCategory(null);
      setShowAddForm(false);
      setNewLimit("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (category: string) => api.deleteBudget(category),
    onSuccess: () => {
      invalidate();
      setDeletingCategory(null);
    },
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

  const spendingMap = Object.fromEntries(
    (spending ?? []).map((s) => [s.category, s.total])
  );

  const usedCategories = new Set((budgets ?? []).map((b) => b.category));
  const availableCategories = CATEGORIES.filter((c) => !usedCategories.has(c));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-medium text-gray-500">Metas por categoria</p>
        {availableCategories.length > 0 && (
          <button
            onClick={() => {
              setNewCategory(availableCategories[0]);
              setShowAddForm((v) => !v);
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            + Nova meta
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-5 p-3 bg-indigo-50 rounded-xl border border-indigo-100 space-y-2">
          <div className="flex gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="text-sm border border-indigo-200 rounded-lg px-2 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {availableCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Limite mensal"
              min="1"
              step="1"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              className="text-sm border border-indigo-200 rounded-lg px-2 py-1.5 w-36 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAddForm(false); setNewLimit(""); }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                const v = parseFloat(newLimit.replace(",", "."));
                if (isNaN(v) || v <= 0) return;
                upsertMutation.mutate({ category: newCategory, limit: v });
              }}
              disabled={upsertMutation.isPending}
              className="text-xs bg-indigo-600 text-white font-medium px-3 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {upsertMutation.isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {!budgets || budgets.length === 0 ? (
        <p className="text-sm text-gray-400">
          Nenhuma meta definida. Use{" "}
          <code className="bg-gray-100 px-1 rounded text-xs">/metas Alimentação 800</code>{" "}
          no bot ou clique em "+ Nova meta".
        </p>
      ) : (
        <div className="space-y-4">
          {budgets.map((b) => {
            const spent = spendingMap[b.category] ?? 0;
            const pct = Math.min((spent / b.monthly_limit) * 100, 100);
            const color = progressColor(pct);
            const isEditing = editingCategory === b.category;
            const isDeleting = deletingCategory === b.category;

            return (
              <div key={b.category} className="group">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-medium text-gray-700">{b.category}</span>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <input
                          type="number"
                          value={editLimit}
                          onChange={(e) => setEditLimit(e.target.value)}
                          step="1"
                          min="1"
                          className="text-xs border border-indigo-200 rounded px-1.5 py-0.5 w-24 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        />
                        <button
                          onClick={() => {
                            const v = parseFloat(editLimit.replace(",", "."));
                            if (isNaN(v) || v <= 0) return;
                            upsertMutation.mutate({ category: b.category, limit: v });
                          }}
                          disabled={upsertMutation.isPending}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </>
                    ) : isDeleting ? (
                      <>
                        <button
                          onClick={() => deleteMutation.mutate(b.category)}
                          disabled={deleteMutation.isPending}
                          className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeletingCategory(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-gray-500">
                          {formatBRL(spent)}{" "}
                          <span className="text-gray-300">/</span>{" "}
                          {formatBRL(b.monthly_limit)}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={() => {
                              setEditingCategory(b.category);
                              setEditLimit(String(b.monthly_limit));
                            }}
                            className="text-gray-400 hover:text-indigo-600 text-xs"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setDeletingCategory(b.category)}
                            className="text-gray-400 hover:text-red-500 text-xs"
                            title="Deletar"
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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
      )}
    </div>
  );
}
