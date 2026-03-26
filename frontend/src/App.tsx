import { useState } from "react";
import BudgetProgress from "./components/BudgetProgress";
import CategoryChart from "./components/CategoryChart";
import DailyChart from "./components/DailyChart";
import SummaryCards from "./components/SummaryCards";
import TransactionsTable from "./components/TransactionsTable";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string) {
  const [year, month] = ym.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export default function App() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">T</span>
          </div>
          <span className="font-semibold text-gray-900 text-lg">
            Trevi Finanças
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="month-picker" className="text-sm text-gray-500">
              Mês:
            </label>
            <input
              id="month-picker"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <a
            href={`${BASE_URL}/api/export?month=${selectedMonth}`}
            download
            className="text-sm bg-indigo-50 text-indigo-600 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            Exportar CSV
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1 capitalize">
            {monthLabel(selectedMonth)}
          </p>
        </div>

        {/* Summary cards */}
        <SummaryCards selectedMonth={selectedMonth} />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DailyChart selectedMonth={selectedMonth} />
          <CategoryChart selectedMonth={selectedMonth} />
        </div>

        {/* Budgets */}
        <BudgetProgress selectedMonth={selectedMonth} />

        {/* Transactions */}
        <TransactionsTable selectedMonth={selectedMonth} />
      </main>
    </div>
  );
}
