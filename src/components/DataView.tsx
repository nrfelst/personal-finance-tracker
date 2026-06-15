import React from 'react';
import { BarChart, PieChart, Info, DollarSign, CalendarRange, ListCollapse } from 'lucide-react';
import { CategorySpend, MonthlySpend } from '../types';

interface DataViewProps {
  monthlySpends: MonthlySpend[];
  categorySpends: CategorySpend[];
}

export default function DataView({ monthlySpends, categorySpends }: DataViewProps) {
  
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Convert "YYYY-MM" to readable "Month YY" e.g. "May 26"
  const formatMonthLabel = (mStr: string) => {
    try {
      const [year, month] = mStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } catch {
      return mStr;
    }
  };

  // Safe maximum values for graph scaling
  const maxMonthly = Math.max(...monthlySpends.map(m => m.total), 1);
  const maxCategory = Math.max(...categorySpends.map(c => c.total), 1);

  // Colored dots helper for categories
  const getCategoryColor = (name: string) => {
    const registry: { [key: string]: string } = {
      'housing': '#475569', // slate-600
      'food': '#10b981', // emerald-500
      'transport': '#f59e0b', // amber-500
      'health': '#6366f1', // indigo-500
      'entertain': '#8b5cf6', // violet-500
    };
    return registry[name.toLowerCase()] || '#4f46e5';
  };

  return (
    <div id="data-view-container" className="space-y-6 max-w-lg mx-auto pb-8">
      
      {/* Title */}
      <div>
        <h2 className="font-sans font-bold text-slate-900 text-2xl tracking-tight">Ledger Analytics</h2>
        <p className="text-xs text-slate-500 font-sans mt-0.5">Explore real-time data insights loaded directly from SQLite database file</p>
      </div>

      {/* Grid 1: Monthly expenses bar chart */}
      <div id="monthly-trend-card" className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center space-x-2">
          <CalendarRange className="w-5 h-5 text-indigo-600" />
          <h3 className="font-sans font-bold text-slate-900 text-lg">Monthly Spending Outline</h3>
        </div>

        {/* Dynamic SVG Bar Chart */}
        <div className="relative pt-6">
          <div className="h-44 w-full flex items-end justify-between px-2 pt-2 relative">
            
            {/* Background grid indicators */}
            <div className="absolute inset-x-0 bottom-0 h-full flex flex-col justify-between pointer-events-none pr-1">
              <div className="w-full border-t border-slate-100 mt-2" />
              <div className="w-full border-t border-slate-100" />
              <div className="w-full border-t border-slate-100" />
              <div className="w-full border-b border-slate-200" />
            </div>

            {monthlySpends.length > 0 ? (
              monthlySpends.map((m, idx) => {
                const heightPercent = (m.total / maxMonthly) * 85; // cap height
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group z-10 mx-1.5">
                    
                    {/* Hover Tooltip banner */}
                    <div className="absolute -top-1 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                      <span className="bg-slate-900 text-white font-mono text-[10px] font-bold py-1 px-2 rounded-md shadow-md whitespace-nowrap">
                        {formatCurrency(m.total)}
                      </span>
                    </div>

                    {/* Bar Pillar */}
                    <div 
                      className="w-full sm:w-10 bg-indigo-600 hover:bg-indigo-700 rounded-t-md transition-all duration-300 cursor-pointer relative"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className="absolute inset-x-0 top-0 h-1.5 bg-white/10 rounded-t-md" />
                    </div>

                    {/* Month Label */}
                    <span className="font-sans text-[10px] font-bold text-slate-400 mt-2.5 uppercase tracking-wider block">
                      {formatMonthLabel(m.month)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 font-sans z-10">
                Insufficient history lines in SQLite to render bar layout.
              </div>
            )}

          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
            The columns visualize total aggregated debits grouped by month over the trailing **6 months** period. Hover column sectors to load precise balances.
          </p>
        </div>
      </div>

      {/* Grid 2: Spending share category chart */}
      <div id="category-distribution-card" className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center space-x-2">
          <ListCollapse className="w-5 h-5 text-indigo-600" />
          <h3 className="font-sans font-bold text-slate-900 text-lg">Spend Share by Category</h3>
        </div>

        <div className="space-y-4">
          {categorySpends.length > 0 ? (
            categorySpends.map((item, idx) => {
              const weightPercent = (item.total / maxCategory) * 100;
              const color = getCategoryColor(item.category);
              return (
                <div key={idx} className="space-y-1.5 group">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-sans font-bold text-slate-700 capitalize">{item.category}</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(item.total)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 ease-out cursor-pointer hover:brightness-110"
                      style={{ 
                        width: `${weightPercent}%`,
                        backgroundColor: color
                      }} 
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-xs text-slate-400 font-sans">
              No categories expense records tracked.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
