import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface TopMerchantsProps {
  selectedMonth: string;
}

export default function TopMerchants({ selectedMonth }: TopMerchantsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["merchants", selectedMonth],
    queryFn: () => api.merchants(selectedMonth),
  });

  const top5 = data?.slice(0, 5) ?? [];
  const maxTotal = top5[0]?.total ?? 1;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm font-medium text-gray-500 mb-5">Top estabelecimentos</p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : top5.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">
          Nenhuma transação no período.
        </div>
      ) : (
        <div className="space-y-3">
          {top5.map((m, i) => {
            const pct = (m.total / maxTotal) * 100;
            return (
              <div key={m.merchant}>
                <div className="flex items-baseline justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                    <span className="text-sm font-medium text-gray-800 truncate max-w-[180px]">
                      {m.merchant}
                    </span>
                    <span className="text-xs text-gray-400">
                      {m.count}x
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatBRL(m.total)}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
