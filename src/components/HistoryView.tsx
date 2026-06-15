import React, { useState, useMemo } from 'react';
import { 
  Search,
  Trash2,
  Trash,
  Pencil,
  ArrowBigDown, 
  ArrowBigUp, 
  Filter, 
  X, 
  Calendar,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import { Transaction } from '../types';

interface HistoryViewProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: number) => Promise<boolean>;
  onEditTransaction: (transaction: Transaction) => void;
  onClearAll: () => Promise<boolean>;
  categories: string[];
}

export default function HistoryView({ transactions, onDeleteTransaction, onEditTransaction, onClearAll, categories }: HistoryViewProps) {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  // Filter transactions based on type, search, and category selection
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());
      
      const matchesType = 
        selectedType === 'all' || 
        t.type === selectedType;

      const matchesCategory = 
        selectedCategory === 'all' || 
        t.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, search, selectedType, selectedCategory]);

  const handleDeleteTrigger = (id: number) => {
    setDeleteId(id);
    setMessage(null);
  };

  const handleConfirmClearAll = async () => {
    setIsClearing(true);
    setMessage(null);
    try {
      const success = await onClearAll();
      if (success) {
        setMessage({ text: 'All transactions cleared. Starting fresh.', isError: false });
        setShowClearConfirm(false);
      } else {
        setMessage({ text: 'Failed to clear transactions.', isError: true });
      }
    } catch (err: any) {
      setMessage({ text: err?.message || 'Clear operation aborted.', isError: true });
    } finally {
      setIsClearing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteId === null) return;
    setIsDeleting(true);
    try {
      const success = await onDeleteTransaction(deleteId);
      if (success) {
        setMessage({ text: 'Activity successfully erased from database.', isError: false });
        // Close modal
        setDeleteId(null);
      } else {
        setMessage({ text: 'Error executing sqlite delete instruction.', isError: true });
      }
    } catch (err: any) {
      setMessage({ text: err?.message || 'Delete operation aborted.', isError: true });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div id="history-view-container" className="space-y-6 max-w-lg mx-auto pb-8">
      
      {/* Visual Title */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-sans font-bold text-slate-900 text-2xl tracking-tight">Ledger History</h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Explore, search, filter and delete transactions inside SQLite</p>
        </div>
        {transactions.length > 0 && (
          <button
            id="clear-all-data-btn"
            onClick={() => { setShowClearConfirm(true); setMessage(null); }}
            className="shrink-0 flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 transition-all focus:outline-hidden cursor-pointer shadow-xs"
            title="Delete every transaction"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {message && (
        <div className={`p-4 border rounded-xl flex items-start space-x-3 text-sm font-sans font-medium ${
          message.isError 
            ? 'bg-rose-50 border-rose-100 text-rose-600' 
            : 'bg-emerald-50 border-emerald-100 text-emerald-700'
        }`}>
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <div className="flex-1">
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Searching and filters row */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
        
        {/* Search Input */}
        <div id="search-input-wrapper" className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            id="ledger-search-input"
            type="text"
            placeholder="Search by description or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-sm transition-all text-slate-900 shadow-xs"
          />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* Type Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">Type</label>
            <select
              id="type-filter-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-xs font-semibold text-slate-600 transition-all cursor-pointer"
            >
              <option value="all">💳 All Activities</option>
              <option value="income">📈 Incomes only</option>
              <option value="expense">📉 Spending only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">Category</label>
            <select
              id="category-filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-xs font-semibold text-slate-600 transition-all cursor-pointer"
            >
              <option value="all">📂 All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Transaction List Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-2 tracking-wider">
          <span>RESULTS ({filteredTransactions.length})</span>
          <span>ORDERED BY DATE DESC</span>
        </div>

        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((t) => {
            const isExpense = t.type === 'expense';
            return (
              <div 
                key={t.id} 
                id={`transaction-log-${t.id}`}
                className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className={`p-2.5 rounded-lg shrink-0 ${isExpense ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
                    {isExpense ? <TrendingDown className="w-5 h-5 animate-pulse" /> : <TrendingUp className="w-5 h-5 animate-pulse" />}
                  </div>
                  <div className="min-w-0">
                    <span className="block font-sans font-bold text-slate-800 text-sm line-clamp-1">{t.description || "Unspecified Description"}</span>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] font-bold rounded-md uppercase">{t.category}</span>
                      <span className="text-slate-400 font-sans text-xs flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        {t.date}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pl-3 shrink-0">
                  <span className={`font-mono font-bold text-base tracking-tight ${isExpense ? 'text-slate-800' : 'text-emerald-600'}`}>
                    {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                  </span>
                  <button
                    id={`edit-btn-for-${t.id}`}
                    onClick={() => onEditTransaction(t)}
                    className="p-2 hover:bg-indigo-50 rounded-lg text-slate-300 hover:text-indigo-500 transition-colors focus:outline-hidden cursor-pointer"
                    title="Edit record"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    id={`delete-btn-for-${t.id}`}
                    onClick={() => handleDeleteTrigger(t.id)}
                    className="p-2 hover:bg-rose-50 rounded-lg text-slate-300 hover:text-rose-500 transition-colors focus:outline-hidden cursor-pointer"
                    title="Delete record"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl p-12 border border-slate-200 text-center space-y-3 shadow-xs">
            <SlidersHorizontal className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-sans font-semibold text-slate-400 text-sm">No transaction matches your filters.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold font-sans text-slate-900 text-lg">Erase transaction?</h4>
              <p className="text-xs text-slate-500 font-sans mt-1">
                Are you sure you want to permanently delete this transaction? This executes a raw SQL command directly in the SQLite core file. This cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="cancel-delete-btn"
                onClick={() => setDeleteId(null)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                No, cancel
              </button>
              <button
                id="confirm-delete-btn"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center cursor-pointer"
              >
                {isDeleting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Yes, Delete SQL"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold font-sans text-slate-900 text-lg">Clear all data?</h4>
              <p className="text-xs text-slate-500 font-sans mt-1">
                This permanently deletes all {transactions.length} transactions and resets your balance to zero. Your budget categories are kept. This cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="cancel-clear-btn"
                onClick={() => setShowClearConfirm(false)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                No, cancel
              </button>
              <button
                id="confirm-clear-btn"
                onClick={handleConfirmClearAll}
                disabled={isClearing}
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center cursor-pointer"
              >
                {isClearing ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Yes, clear everything"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
