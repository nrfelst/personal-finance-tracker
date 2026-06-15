import React, { useState, useEffect } from 'react';
import { SignIn, useUser } from '@clerk/react';
import {
  Home,
  History as HistoryIcon,
  Coins,
  BarChart3,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Transaction, CategoryBudget, CategorySpend, MonthlySpend, InvestmentsData } from './types';

// Import our views
import HomeView from './components/HomeView';
import HistoryView from './components/HistoryView';
import BudgetView from './components/BudgetView';
import DataView from './components/DataView';
import InvestmentsView from './components/InvestmentsView';
import AddTransactionModal from './components/AddTransactionModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'budget' | 'data' | 'invest'>('home');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpenses: 0, netBalance: 0 });
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [monthlySpends, setMonthlySpends] = useState<MonthlySpend[]>([]);
  const [categorySpends, setCategorySpends] = useState<CategorySpend[]>([]);
  const [investments, setInvestments] = useState<InvestmentsData>({ accounts: [], total: 0, byType: [] });
  
  const [loading, setLoading] = useState(true);
  const [errorList, setErrorList] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Category names for the transaction dropdown — derived from live budgets so user-added
  // categories appear, with Salary/Other always available for income/uncategorized entries.
  const categoriesList = Array.from(
    new Set([...budgets.map((b) => b.name), 'Salary', 'Other'])
  );

  // 1. Loader functions
  const fetchAllData = async () => {
    setLoading(true);
    const errors: string[] = [];
    
    try {
      const summaryRes = await fetch('/transactions/summary');
      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      } else {
        errors.push("Failed to load totals summary.");
      }
    } catch {
      errors.push("Backend summary network breakdown.");
    }

    try {
      const txRes = await fetch('/transactions');
      if (txRes.ok) {
        setTransactions(await txRes.json());
      } else {
        errors.push("Failed to fetch SQLite transactions.");
      }
    } catch {
      errors.push("Database transactions query dropped.");
    }

    try {
      const budgetRes = await fetch('/budget');
      if (budgetRes.ok) {
        setBudgets(await budgetRes.json());
      } else {
        errors.push("Failed to load budget allowance matrix.");
      }
    } catch {
      errors.push("Budget tracking stream dropped.");
    }

    try {
      const monthlyRes = await fetch('/transactions/monthly');
      if (monthlyRes.ok) {
        setMonthlySpends(await monthlyRes.json());
      } else {
        errors.push("Failed to resolve monthly timeline metrics.");
      }
    } catch {
      errors.push("Timeline stats network timeout.");
    }

    try {
      const categorySpendRes = await fetch('/transactions/by-category');
      if (categorySpendRes.ok) {
        setCategorySpends(await categorySpendRes.json());
      } else {
        errors.push("Failed to load categories allocation details.");
      }
    } catch {
      errors.push("Share breakdown matrix timeout.");
    }

    try {
      const investRes = await fetch('/investments');
      if (investRes.ok) {
        setInvestments(await investRes.json());
      } else {
        errors.push("Failed to load investment accounts.");
      }
    } catch {
      errors.push("Investments network timeout.");
    }

    setErrorList(errors);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Poll investment values periodically so live stock prices stay current while the app is open.
  useEffect(() => {
    const interval = setInterval(() => {
      refreshInvestments();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // 2. Action Submissions Handlers
  const handleAddTransaction = async (data: {
    amount: number;
    date: string;
    category: string;
    description: string;
    type: 'income' | 'expense';
  }): Promise<boolean> => {
    try {
      const res = await fetch('/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await fetchAllData(); // reload sqlite stats
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDeleteTransaction = async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`/transactions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchAllData(); // reload sqlite stats
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleUpdateTransaction = async (
    id: number,
    data: { amount: number; date: string; category: string; description: string; type: 'income' | 'expense' }
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await fetchAllData(); // reload sqlite stats
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Routes the modal submit to create or update depending on edit state
  const handleModalSubmit = async (data: {
    amount: number;
    date: string;
    category: string;
    description: string;
    type: 'income' | 'expense';
  }): Promise<boolean> => {
    if (editingTransaction) {
      return handleUpdateTransaction(editingTransaction.id, data);
    }
    return handleAddTransaction(data);
  };

  const closeTransactionModal = () => {
    setIsAddModalOpen(false);
    setEditingTransaction(null);
  };

  const handleClearAllData = async (): Promise<boolean> => {
    try {
      const res = await fetch('/transactions', { method: 'DELETE' });
      if (res.ok) {
        await fetchAllData(); // reload sqlite stats
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleAddCategory = async (name: string, budgetLimit: number): Promise<boolean> => {
    try {
      const res = await fetch('/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, budget_limit: budgetLimit })
      });
      if (res.ok) {
        await fetchAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDeleteCategory = async (categoryId: number): Promise<boolean> => {
    try {
      const res = await fetch(`/categories/${categoryId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleAddInvestment = async (name: string, type: string, amount: number): Promise<boolean> => {
    try {
      const res = await fetch('/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, amount })
      });
      if (res.ok) {
        await fetchAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleUpdateInvestment = async (id: number, name: string, type: string, amount: number): Promise<boolean> => {
    try {
      const res = await fetch(`/investments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, amount })
      });
      if (res.ok) {
        await fetchAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDeleteInvestment = async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`/investments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const refreshInvestments = async () => {
    try {
      const res = await fetch('/investments');
      if (res.ok) setInvestments(await res.json());
    } catch {
      // Ignore transient polling errors.
    }
  };

  const handleAddHolding = async (
    accountId: number,
    payload: { ticker: string; name: string; shares: number; cost_basis: number }
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/investments/${accountId}/holdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await refreshInvestments();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleUpdateHolding = async (
    id: number,
    payload: { ticker: string; name: string; shares: number; cost_basis: number }
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/holdings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await refreshInvestments();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDeleteHolding = async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`/holdings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshInvestments();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleSearchStocks = async (q: string) => {
    try {
      const res = await fetch(`/stocks/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        return data.results || [];
      }
      return [];
    } catch {
      return [];
    }
  };

  const handleGetQuote = async (symbol: string): Promise<number | null> => {
    try {
      const res = await fetch(`/stocks/quote?symbol=${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const data = await res.json();
        return typeof data.price === 'number' ? data.price : null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleUpdateBudgetLimit = async (categoryId: number, budgetLimit: number): Promise<boolean> => {
    try {
      const res = await fetch(`/budget/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget_limit: budgetLimit })
      });
      if (res.ok) {
        await fetchAllData(); // reload sqlite metrics
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeView
            summary={summary}
            transactions={transactions}
            investmentsTotal={investments.total}
            onNavigateToHistory={() => setActiveTab('history')}
            onAddTransactionClick={() => setIsAddModalOpen(true)}
          />
        );
      case 'history':
        return (
          <HistoryView
            transactions={transactions}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={(t) => setEditingTransaction(t)}
            onClearAll={handleClearAllData}
            categories={categoriesList}
          />
        );
      case 'budget':
        return (
          <BudgetView
            budgets={budgets}
            onUpdateBudgetLimit={handleUpdateBudgetLimit}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        );
      case 'data':
        return (
          <DataView 
            monthlySpends={monthlySpends}
            categorySpends={categorySpends}
          />
        );
      case 'invest':
        return (
          <InvestmentsView
            data={investments}
            onAddInvestment={handleAddInvestment}
            onUpdateInvestment={handleUpdateInvestment}
            onDeleteInvestment={handleDeleteInvestment}
            onAddHolding={handleAddHolding}
            onUpdateHolding={handleUpdateHolding}
            onDeleteHolding={handleDeleteHolding}
            onSearchStocks={handleSearchStocks}
            onGetQuote={handleGetQuote}
          />
        );
      default:
        return null;
    }
  };

  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 space-y-6">
        <div className="text-center">
          <h1 className="font-sans font-bold text-slate-900 text-2xl tracking-tight">Personal Finance Tracker</h1>
          <p className="text-sm text-slate-500 font-sans mt-1">Sign in to access your dashboard.</p>
        </div>
        <SignIn />
      </div>
    );
  }

  return (
    <div id="applet-background" className="min-h-screen bg-slate-50 flex flex-col antialiased">
      
      {/* Scrollable Frame Panel Area */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-4 pb-28">
        
        {/* Persistent SQLite sync connection feedback */}
        {errorList.length > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-amber-800">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold font-sans">SQLite Synced Warns ({errorList.length})</p>
              <ul className="list-disc pl-4 mt-1 space-y-0.5 font-sans font-medium text-amber-700">
                {errorList.slice(0, 2).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <span className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="font-mono text-slate-400 text-xs font-semibold uppercase tracking-wider animate-pulse">Quering SQLite Connection...</p>
          </div>
        ) : (
          renderActiveView()
        )}
      </main>

      {/* Primary Floating Mobile Bottom Nav bar (Fidelity inspired by the screenshot) */}
      <nav id="floating-bottom-nav" className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 py-2 shadow-lg">
        <div className="max-w-lg mx-auto flex justify-around items-center px-4">
          
          {/* Tab Home */}
          <button
            id="nav-tab-home-btn"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center py-1.5 px-3.5 rounded-xl transition-all focus:outline-hidden ${
              activeTab === 'home' 
                ? 'text-indigo-600 font-bold bg-indigo-50/85 border border-indigo-100/50 scale-102 shadow-xs' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-sans font-semibold mt-1">Home</span>
          </button>

          {/* Tab History */}
          <button
            id="nav-tab-history-btn"
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center py-1.5 px-3.5 rounded-xl transition-all focus:outline-hidden ${
              activeTab === 'history' 
                ? 'text-indigo-600 font-bold bg-indigo-50/85 border border-indigo-100/50 scale-102 shadow-xs' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <HistoryIcon className="w-5 h-5" />
            <span className="text-[10px] font-sans font-semibold mt-1">History</span>
          </button>

          {/* Tab Budget */}
          <button
            id="nav-tab-budget-btn"
            onClick={() => setActiveTab('budget')}
            className={`flex flex-col items-center py-1.5 px-3.5 rounded-xl transition-all focus:outline-hidden ${
              activeTab === 'budget' 
                ? 'text-indigo-600 font-bold bg-indigo-50/85 border border-indigo-100/50 scale-102 shadow-xs' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Coins className="w-5 h-5" />
            <span className="text-[10px] font-sans font-semibold mt-1">Budget</span>
          </button>

          {/* Tab Data / Analyze */}
          <button
            id="nav-tab-data-btn"
            onClick={() => setActiveTab('data')}
            className={`flex flex-col items-center py-1.5 px-3.5 rounded-xl transition-all focus:outline-hidden ${
              activeTab === 'data' 
                ? 'text-indigo-600 font-bold bg-indigo-50/85 border border-indigo-100/50 scale-102 shadow-xs' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-sans font-semibold mt-1">Data</span>
          </button>

          {/* Tab Investments */}
          <button
            id="nav-tab-invest-btn"
            onClick={() => setActiveTab('invest')}
            className={`flex flex-col items-center py-1.5 px-3.5 rounded-xl transition-all focus:outline-hidden ${
              activeTab === 'invest'
                ? 'text-indigo-600 font-bold bg-indigo-50/85 border border-indigo-100/50 scale-102 shadow-xs'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] font-sans font-semibold mt-1">Invest</span>
          </button>

        </div>
      </nav>

      {/* Global Add / Edit transaction modal sheet overlay */}
      <AddTransactionModal
        isOpen={isAddModalOpen || editingTransaction !== null}
        onClose={closeTransactionModal}
        onSubmit={handleModalSubmit}
        categories={categoriesList}
        initialTransaction={editingTransaction}
      />

    </div>
  );
}
