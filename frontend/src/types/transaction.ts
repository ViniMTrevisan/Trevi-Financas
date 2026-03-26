export interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  category: string;
  transaction_date: string; // "YYYY-MM-DD"
  source: "photo" | "text";
  created_at: string;
}

export interface SummaryToday {
  total: number;
  count: number;
}

export interface DailyTotal {
  date: string; // "YYYY-MM-DD"
  total: number;
}

export interface SummaryMonth {
  total: number;
  count: number;
  month: string; // "YYYY-MM"
  daily: DailyTotal[];
}

export interface CategoryTotal {
  category: string;
  total: number;
  count: number;
}
