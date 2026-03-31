import { useState } from "react";
import BudgetProgress from "./components/BudgetProgress";
import CategoryChart from "./components/CategoryChart";
import CommandsReference from "./components/CommandsReference";
import DailyChart from "./components/DailyChart";
import ExtraMetricsCards from "./components/ExtraMetricsCards";
import InvestmentCards from "./components/InvestmentCards";
import InvestmentChart from "./components/InvestmentChart";
import InvestmentHistory from "./components/InvestmentHistory";
import SummaryCards from "./components/SummaryCards";
import TopMerchants from "./components/TopMerchants";
import TransactionsTable from "./components/TransactionsTable";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type Tab = "dashboard" | "transacoes" | "investimentos" | "comandos";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "transacoes", label: "Transações" },
  { id: "investimentos", label: "Investimentos" },
  { id: "comandos", label: "Comandos" },
];

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
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const showMonthPicker = activeTab === "dashboard" || activeTab === "transacoes";


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
        {showMonthPicker && (
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
        )}
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 px-6">
        <nav className="flex gap-1 max-w-6xl mx-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-400 mt-1 capitalize">
                {monthLabel(selectedMonth)}
              </p>
            </div>

            <SummaryCards selectedMonth={selectedMonth} />
            <ExtraMetricsCards selectedMonth={selectedMonth} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DailyChart selectedMonth={selectedMonth} />
              <CategoryChart selectedMonth={selectedMonth} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TopMerchants selectedMonth={selectedMonth} />
              <BudgetProgress selectedMonth={selectedMonth} />
            </div>
          </div>
        )}

        {activeTab === "transacoes" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
                <p className="text-sm text-gray-400 mt-1 capitalize">
                  {monthLabel(selectedMonth)}
                </p>
              </div>
              <a
                href={`${BASE_URL}/api/export?month=${selectedMonth}`}
                download
                className="text-sm bg-indigo-50 text-indigo-600 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Exportar CSV
              </a>
            </div>
            <TransactionsTable selectedMonth={selectedMonth} />
          </div>
        )}

        {activeTab === "investimentos" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Investimentos</h1>
              <p className="text-sm text-gray-400 mt-1">
                Evolução da carteira de CDB — registre no dia 10 de cada mês
              </p>
            </div>
            <InvestmentCards />
            <InvestmentChart />
            <InvestmentHistory />
          </div>
        )}

        {activeTab === "comandos" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Comandos</h1>
              <p className="text-sm text-gray-400 mt-1">
                Referência rápida de todos os comandos do bot no Telegram
              </p>
            </div>
            <CommandsReference />
          </div>
        )}
      </main>
    </div>
  );
}
