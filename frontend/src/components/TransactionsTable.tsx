import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";
import type { TransactionIn } from "../types/transaction";

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

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

interface TransactionsTableProps {
  selectedMonth: string;
}

interface EditState {
  amount: string;
  merchant: string;
  category: string;
}

const EMPTY_FORM: TransactionIn = {
  amount: 0,
  merchant: "",
  category: "Outro",
  transaction_date: todayISO(),
};

export default function TransactionsTable({ selectedMonth }: TransactionsTableProps) {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ amount: "", merchant: "", category: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTx, setNewTx] = useState<TransactionIn>({ ...EMPTY_FORM });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const txQueryKey = ["transactions", selectedMonth, categoryFilter];

  const { data, isLoading } = useQuery({
    queryKey: txQueryKey,
    queryFn: () =>
      api.transactions({
        month: selectedMonth,
        category: categoryFilter || undefined,
        limit: 100,
      }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions", selectedMonth] });
    queryClient.invalidateQueries({ queryKey: ["summary-month", selectedMonth] });
    queryClient.invalidateQueries({ queryKey: ["summary-today"] });
    queryClient.invalidateQueries({ queryKey: ["merchants", selectedMonth] });
    queryClient.invalidateQueries({ queryKey: ["categories", selectedMonth] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TransactionIn> }) =>
      api.updateTransaction(id, data),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: () => {
      invalidate();
      setDeletingId(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: TransactionIn) => api.createTransaction(data),
    onSuccess: () => {
      invalidate();
      setShowAddForm(false);
      setNewTx({ ...EMPTY_FORM, transaction_date: todayISO() });
    },
  });

  function startEdit(id: string, amount: number, merchant: string, category: string) {
    setEditingId(id);
    setEditState({
      amount: String(amount),
      merchant,
      category,
    });
  }

  function saveEdit(id: string) {
    const parsed = parseFloat(editState.amount.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) return;
    updateMutation.mutate({
      id,
      data: {
        amount: parsed,
        merchant: editState.merchant,
        category: editState.category,
      },
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
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
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="text-sm bg-indigo-600 text-white font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Nova transação
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-5 p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3">
          <p className="text-sm font-medium text-indigo-700">Nova transação</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Data</label>
              <input
                type="date"
                value={newTx.transaction_date}
                onChange={(e) => setNewTx((v) => ({ ...v, transaction_date: e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Estabelecimento</label>
              <input
                type="text"
                placeholder="Ex: iFood"
                value={newTx.merchant}
                onChange={(e) => setNewTx((v) => ({ ...v, merchant: e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Categoria</label>
              <select
                value={newTx.category}
                onChange={(e) => setNewTx((v) => ({ ...v, category: e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Valor (R$)</label>
              <input
                type="number"
                placeholder="0.00"
                min="0.01"
                step="0.01"
                value={newTx.amount || ""}
                onChange={(e) => setNewTx((v) => ({ ...v, amount: parseFloat(e.target.value) || 0 }))}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAddForm(false); setNewTx({ ...EMPTY_FORM, transaction_date: todayISO() }); }}
              className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!newTx.merchant || newTx.amount <= 0) return;
                createMutation.mutate(newTx);
              }}
              disabled={createMutation.isPending}
              className="text-sm bg-indigo-600 text-white font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
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
                <th className="pb-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((tx) =>
                editingId === tx.id ? (
                  <tr key={tx.id} className="bg-indigo-50/50">
                    <td className="py-2 text-gray-500">{formatDate(tx.transaction_date)}</td>
                    <td className="py-2">
                      <input
                        type="text"
                        value={editState.merchant}
                        onChange={(e) => setEditState((s) => ({ ...s, merchant: e.target.value }))}
                        className="w-full text-sm border border-indigo-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </td>
                    <td className="py-2">
                      <select
                        value={editState.category}
                        onChange={(e) => setEditState((s) => ({ ...s, category: e.target.value }))}
                        className="text-sm border border-indigo-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        value={editState.amount}
                        onChange={(e) => setEditState((s) => ({ ...s, amount: e.target.value }))}
                        step="0.01"
                        min="0.01"
                        className="w-24 text-sm text-right border border-indigo-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => saveEdit(tx.id)}
                          disabled={updateMutation.isPending}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="py-3 text-gray-500">{formatDate(tx.transaction_date)}</td>
                    <td className="py-3 text-gray-900 font-medium">{tx.merchant}</td>
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
                    <td className="py-3">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(tx.id, tx.amount, tx.merchant, tx.category)}
                          className="text-gray-400 hover:text-indigo-600 p-1 rounded transition-colors"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        {deletingId === tx.id ? (
                          <>
                            <button
                              onClick={() => deleteMutation.mutate(tx.id)}
                              disabled={deleteMutation.isPending}
                              className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeletingId(tx.id)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                            title="Deletar"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
