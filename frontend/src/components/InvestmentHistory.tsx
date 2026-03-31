import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDatePtBr(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export default function InvestmentHistory() {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: snapshots, isLoading } = useQuery({
    queryKey: ["investments"],
    queryFn: () => api.investments(),
  });

  const createMutation = useMutation({
    mutationFn: api.createInvestment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["investments"] });
      void queryClient.invalidateQueries({ queryKey: ["investment-summary"] });
      setShowForm(false);
      setFormAmount("");
      setFormNotes("");
      setFormError("");
    },
    onError: (err: Error) => {
      setFormError(err.message.includes("409") ? "Já existe um registro para essa data." : err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteInvestment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["investments"] });
      void queryClient.invalidateQueries({ queryKey: ["investment-summary"] });
      setDeleteId(null);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const amount = parseFloat(formAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      setFormError("Informe um valor válido.");
      return;
    }
    createMutation.mutate({
      amount,
      notes: formNotes || undefined,
      snapshot_date: formDate,
    });
  }

  // Ordenar do mais recente para o mais antigo para a tabela
  const sorted = [...(snapshots ?? [])].sort((a, b) =>
    b.snapshot_date.localeCompare(a.snapshot_date)
  );

  // Calcular variação de cada linha vs o anterior (mais antigo)
  const allSorted = [...(snapshots ?? [])].sort((a, b) =>
    a.snapshot_date.localeCompare(b.snapshot_date)
  );
  const growthMap: Record<string, number | null> = {};
  allSorted.forEach((s, i) => {
    if (i === 0) {
      growthMap[s.id] = null;
    } else {
      growthMap[s.id] = Number(s.amount) - Number(allSorted[i - 1].amount);
    }
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Histórico de registros</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm bg-emerald-50 text-emerald-700 font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          {showForm ? "Cancelar" : "+ Novo registro"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Saldo (R$)</label>
              <input
                type="text"
                placeholder="ex: 13500,00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Data</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Observação (opcional)</label>
              <input
                type="text"
                placeholder="ex: Rendimento ótimo"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </div>
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="text-sm bg-emerald-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? "Salvando..." : "Salvar"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-50 rounded-lg" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-gray-400">
          Nenhum registro ainda. Use <code className="bg-gray-100 px-1 rounded">/investimento</code> no bot ou crie acima.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Saldo</th>
                <th className="pb-2 font-medium">Variação</th>
                <th className="pb-2 font-medium">Observação</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => {
                const growth = growthMap[s.id];
                const isDeleting = deleteMutation.isPending && deleteId === s.id;
                return (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 text-gray-700">{formatDatePtBr(s.snapshot_date)}</td>
                    <td className="py-3 font-semibold text-gray-900">{fmt(Number(s.amount))}</td>
                    <td className="py-3">
                      {growth === null ? (
                        <span className="text-gray-300 text-xs">primeiro</span>
                      ) : (
                        <span className={growth >= 0 ? "text-emerald-600" : "text-red-500"}>
                          {growth >= 0 ? "+" : ""}{fmt(growth)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-gray-400 text-xs">{s.notes ?? "—"}</td>
                    <td className="py-3 text-right">
                      {deleteId === s.id ? (
                        <span className="text-xs text-gray-400 flex items-center justify-end gap-2">
                          Confirmar?
                          <button
                            onClick={() => deleteMutation.mutate(s.id)}
                            disabled={isDeleting}
                            className="text-red-500 hover:text-red-700 font-medium"
                          >
                            {isDeleting ? "..." : "Sim"}
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            Não
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setDeleteId(s.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                          title="Deletar"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
