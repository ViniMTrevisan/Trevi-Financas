import type {
  Budget,
  CategoryTotal,
  MerchantTotal,
  SummaryMonth,
  SummaryToday,
  Transaction,
  TransactionIn,
} from "../types/transaction";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
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

  merchants: (month?: string) =>
    get<MerchantTotal[]>(
      `/api/summary/merchants${month ? `?month=${month}` : ""}`
    ),

  transactions: (params?: { month?: string; category?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.month) qs.set("month", params.month);
    if (params?.category) qs.set("category", params.category);
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return get<Transaction[]>(`/api/transactions${query ? `?${query}` : ""}`);
  },

  createTransaction: (data: TransactionIn) =>
    post<Transaction>("/api/transactions", data),

  updateTransaction: (id: string, data: Partial<TransactionIn>) =>
    put<Transaction>(`/api/transactions/${id}`, data),

  deleteTransaction: (id: string) => del(`/api/transactions/${id}`),

  budgets: () => get<Budget[]>("/api/budgets"),

  updateBudget: (category: string, monthly_limit: number) =>
    put<Budget>(`/api/budgets/${category}`, { monthly_limit }),

  deleteBudget: (category: string) => del(`/api/budgets/${category}`),
};
