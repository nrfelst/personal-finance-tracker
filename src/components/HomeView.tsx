import React, { useMemo } from 'react';
import { UserButton } from '@clerk/react';
import {
  ArrowDownCircle,
  ArrowUpCircle, 
  Plus, 
  CreditCard,
  ShoppingBag,
  Briefcase,
  Layers,
  ArrowRight,
  MoreVertical,
  Calendar
} from 'lucide-react';
import { Transaction } from '../types';

interface HomeViewProps {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
  };
  transactions: Transaction[];
  investmentsTotal: number;
  onNavigateToHistory: () => void;
  onAddTransactionClick: () => void;
}

export default function HomeView({
  summary,
  transactions,
  investmentsTotal,
  onNavigateToHistory,
  onAddTransactionClick
}: HomeViewProps) {
  
  // Format currencies nicely
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  const formattedBalance = formatCurrency(summary.netBalance);
  const formattedIncome = formatCurrency(summary.totalIncome);
  const formattedExpenses = formatCurrency(summary.totalExpenses);

  // Compute category breakdown from transactions of type 'expense' for this month (May 2026)
  const categoryBreakdown = useMemo(() => {
    const limits: { [key: string]: { total: number; color: string } } = {
      'Housing': { total: 0, color: '#1B2430' },  // Deep Navy
      'Food': { total: 0, color: '#0F766E' },     // Teal / Green
      'Transport': { total: 0, color: '#B91C1C' }, // Crimson / Red
      'Health': { total: 0, color: '#EA580C' },    // Orange / Coral
      'Entertain': { total: 0, color: '#4B5563' }, // Slate Gray
    };

    // Use the most recent month present in the data as the "current" month
    // (transactions arrive sorted by date descending), falling back to all expenses.
    const currentYearMonth = transactions.length > 0 ? transactions[0].date.substring(0, 7) : '';
    let totalComputedExpenses = 0;

    transactions.forEach(t => {
      // Check current year/month
      if (t.type === 'expense' && t.date.substring(0, 7) === currentYearMonth) {
        const cat = t.category;
        if (limits[cat]) {
          limits[cat].total += t.amount;
        } else {
          // Dynamic category color fallback
          limits[cat] = { total: t.amount, color: '#8B5CF6' }; 
        }
        totalComputedExpenses += t.amount;
      }
    });

    // If no transactions in May 2026, fallback to all expenses to populate visual chart
    if (totalComputedExpenses === 0) {
      transactions.forEach(t => {
        if (t.type === 'expense') {
          const cat = t.category;
          if (limits[cat]) {
            limits[cat].total += t.amount;
          } else {
            limits[cat] = { total: t.amount, color: '#8B5CF6' };
          }
          totalComputedExpenses += t.amount;
        }
      });
    }

    const series = Object.entries(limits).map(([name, data]) => ({
      name,
      value: data.total,
      color: data.color,
      percentage: totalComputedExpenses > 0 ? (data.total / totalComputedExpenses) * 100 : 0
    })).filter(s => s.value > 0);

    return {
      series,
      total: totalComputedExpenses || summary.totalExpenses
    };
  }, [transactions, summary.totalExpenses]);

  // Compute math for the SVG Donut chart
  const donutChartData = useMemo(() => {
    let accumulatedLength = 0;
    const radius = 50;
    const strokeWidth = 12;
    const circumference = 2 * Math.PI * radius;

    return categoryBreakdown.series.map(item => {
      const percentage = item.percentage;
      const strokeLength = (percentage / 100) * circumference;
      // Offset each segment to start where the previous one ended.
      const strokeOffset = -accumulatedLength;
      accumulatedLength += strokeLength;

      return {
        ...item,
        strokeLength,
        strokeOffset,
        radius,
        strokeWidth,
        circumference
      };
    });
  }, [categoryBreakdown]);

  // Take the 3 most recent activities
  const recentActivities = useMemo(() => {
    return transactions.slice(0, 3);
  }, [transactions]);

  // Icon selector based on category description
  const getActivityIcon = (category: string, description: string, type: 'income' | 'expense') => {
    if (type === 'income') return <Briefcase className="w-5 h-5 text-emerald-500" />;
    
    const catLower = category.toLowerCase();
    const descLower = description.toLowerCase();
    
    if (catLower.includes('food') || descLower.includes('whole foods') || descLower.includes('groceries')) {
      return <ShoppingBag className="w-5 h-5 text-indigo-500" />;
    }
    if (catLower.includes('entertain') || descLower.includes('netflix') || descLower.includes('spotify')) {
      return <Layers className="w-5 h-5 text-pink-500" />;
    }
    return <CreditCard className="w-5 h-5 text-amber-500" />;
  };

  return (
    <div id="home-view-container" className="space-y-6 max-w-lg mx-auto pb-8 relative">
      
      {/* 1. Header Portion */}
      <div className="flex items-center justify-between px-2 pt-2">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-white text-slate-900 rounded-xl shadow-sm border border-slate-200">
            <CreditCard className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xs font-sans font-medium text-slate-400 uppercase tracking-wider">Welcome Back</h2>
            <p className="font-sans font-bold text-slate-900 text-base">Your Finances</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Badge indicator */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100/60 rounded-full">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
            <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase">SQLite Core Live</span>
          </div>
          <div id="user-profile-avatar" className="w-11 h-11 flex items-center justify-center">
            <UserButton appearance={{ elements: { avatarBox: 'w-11 h-11' } }} />
          </div>
        </div>
      </div>

      {/* 2. Total Balance Card */}
      <div id="total-balance-card" className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
        {/* Subtle glow background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
        
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-slate-400">Total Balance</p>
        <h1 className="text-4xl sm:text-5xl font-sans font-bold text-slate-900 tracking-tight mt-1">{formattedBalance}</h1>

        {/* Net worth = cash balance + investments */}
        <div className="mt-3 flex items-center flex-wrap gap-x-2 gap-y-0.5">
          <span className="text-xs font-sans font-medium text-slate-400">Net worth (incl. investments):</span>
          <span className="text-sm font-sans font-bold text-indigo-600">{formatCurrency(summary.netBalance + investmentsTotal)}</span>
        </div>

        {/* Buttons: Add Funds, Withdraw */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100">
          <button 
            id="add-funds-btn"
            onClick={onAddTransactionClick}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all shadow-sm focus:outline-hidden cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add Funds</span>
          </button>
          <button 
            id="withdraw-btn"
            onClick={onAddTransactionClick}
            className="py-2.5 px-4 bg-white hover:bg-slate-50 active:scale-98 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all shadow-sm focus:outline-hidden cursor-pointer"
          >
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* 3. Income / Expenses row widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Income Widget */}
        <div id="total-income-widget" className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
          <span className="p-3 bg-emerald-50 rounded-lg text-emerald-600 shrink-0">
            <ArrowDownCircle className="w-6 h-6 animate-pulse" />
          </span>
          <div>
            <span className="text-xs font-sans font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Total Income</span>
            <span className="text-xl font-sans font-bold text-emerald-600 block">{formattedIncome}</span>
          </div>
        </div>

        {/* Total Expenses Widget */}
        <div id="total-expenses-widget" className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
          <span className="p-3 bg-rose-50 rounded-lg text-rose-600 shrink-0">
            <ArrowUpCircle className="w-6 h-6 animate-pulse" />
          </span>
          <div>
            <span className="text-xs font-sans font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Total Expenses</span>
            <span className="text-xl font-sans font-bold text-rose-600 block">{formattedExpenses}</span>
          </div>
        </div>
      </div>

      {/* 4. Spending Breakdown Card */}
      <div id="spending-breakdown-card" className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-sans font-bold text-slate-900 text-lg tracking-tight">Spending Breakdown</h3>
          <div className="flex items-center space-x-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-sans font-bold text-slate-500 uppercase tracking-wider px-0.5">This Month</span>
          </div>
        </div>

        {/* SVG Donut Chart */}
        <div className="flex flex-col items-center justify-center py-4 relative">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              {/* Back track ring */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#F1F5F9"
                strokeWidth="11"
              />
              {/* Colored Segments */}
              {donutChartData.map((seg, i) => (
                <circle
                  key={i}
                  cx="60"
                  cy="60"
                  r={seg.radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={seg.strokeWidth}
                  strokeDasharray={`${seg.strokeLength} ${seg.circumference}`}
                  strokeDashoffset={seg.strokeOffset}
                  className="transition-all duration-500 ease-out"
                />
              ))}
            </svg>
            {/* Inner Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">TOTAL</span>
              <span className="text-2xl font-sans font-extrabold text-slate-900 mt-0.5">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(categoryBreakdown.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Categories Breakdown Legend List */}
        <div className="space-y-2.5 pt-2">
          {categoryBreakdown.series.length > 0 ? (
            categoryBreakdown.series.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100/50 hover:border-slate-200/50 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-sans font-semibold text-slate-700 text-sm">{item.name}</span>
                </div>
                <div className="flex items-center space-x-2 font-mono text-xs">
                  <span className="text-slate-400 font-medium">({item.percentage.toFixed(1)}%)</span>
                  <span className="font-bold text-slate-950">{formatCurrency(item.value)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-xs text-slate-400 font-sans">
              No transactions registered for the current period yet.
            </div>
          )}
        </div>
      </div>

      {/* 5. Recent Activity Panel (Refactored to matches light Professional Polish Theme) */}
      <div id="recent-activity-card" className="bg-white text-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 mt-6 space-y-5">
        
        <div className="flex items-center justify-between pb-1">
          <div>
            <h4 className="font-sans font-bold text-lg text-slate-900">Recent Transactions</h4>
            <p className="text-xs text-slate-500 font-sans mt-0.5">Latest SQLite database activity logs</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-50 rounded-full focus:outline-hidden">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Activity List */}
        <div className="space-y-3">
          {recentActivities.length > 0 ? (
            recentActivities.map((act) => {
              const isIncome = act.type === 'income';
              return (
                <div 
                  key={act.id} 
                  className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200/70 transition-all"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2.5 bg-white border border-slate-100 rounded-lg shrink-0">
                      {getActivityIcon(act.category, act.description, act.type)}
                    </div>
                    <div>
                      <span className="block font-sans font-semibold text-sm text-slate-900 line-clamp-1">{act.description || act.category}</span>
                      <span className="block font-sans text-xs text-slate-400 mt-0.5">{act.category} • {act.date}</span>
                    </div>
                  </div>
                  <span className={`font-mono text-sm font-bold tracking-tight shrink-0 ${isIncome ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {isIncome ? '+' : '-'}{formatCurrency(act.amount)}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-xs text-slate-400 font-sans">
              No recent ledger logs found.
            </div>
          )}
        </div>

        <button 
          id="view-all-activity-btn"
          onClick={onNavigateToHistory}
          className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-center font-sans font-semibold text-xs text-slate-600 rounded-lg hover:text-indigo-600 transition-all flex items-center justify-center space-x-2 focus:outline-hidden cursor-pointer"
        >
          <span>View All Activity</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Spark Plus Action Button */}
      <button 
        id="floating-add-txn-btn"
        onClick={onAddTransactionClick}
        className="fixed bottom-24 right-4 sm:right-6 lg:right-8 bg-indigo-600 hover:bg-indigo-700 hover:scale-105 active:scale-95 text-white shadow-lg p-4 rounded-full transition-all duration-200 z-40 border border-indigo-500 cursor-pointer"
        title="Add transaction"
      >
        <Plus className="w-6 h-6 text-white text-center" />
      </button>

    </div>
  );
}
