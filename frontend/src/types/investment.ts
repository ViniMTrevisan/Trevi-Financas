export interface InvestmentSnapshot {
  id: string;
  amount: number;
  notes?: string | null;
  snapshot_date: string; // "YYYY-MM-DD"
  created_at: string;
}

export interface InvestmentSummary {
  latest_amount: number | null;
  previous_amount: number | null;
  growth_abs: number | null;
  growth_pct: number | null;
  total_growth_abs: number | null;
  total_growth_pct: number | null;
  snapshots_count: number;
}

export interface InvestmentSnapshotIn {
  amount: number;
  notes?: string;
  snapshot_date?: string; // "YYYY-MM-DD", backend usa hoje se omitido
}
