import type {
  Budget,
  CategoryTotal,
  SummaryMonth,
  SummaryToday,
  Transaction,
} from "../types/transaction";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  summaryToday: () => get<SummaryToday>("/api/summary/today"),

  summaryMonth: (month?: string) =>
    get<SummaryMonth>(
      `/api/summary/month${month ? `?month=${month}` : ""}`
    ),

  categories: (month?: string) =>
    get<CategoryTotal[]>(
      `/api/summary/categories${month ? `?month=${month}` : ""}`
    ),

  transactions: (params?: { month?: string; category?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.month) qs.set("month", params.month);
    if (params?.category) qs.set("category", params.category);
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return get<Transaction[]>(`/api/transactions${query ? `?${query}` : ""}`);
  },

  budgets: () => get<Budget[]>("/api/budgets"),
};
