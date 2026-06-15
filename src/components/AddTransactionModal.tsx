import React, { useState, useEffect } from 'react';
import { X, CornerDownLeft } from 'lucide-react';
import { Transaction } from '../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    amount: number;
    date: string;
    category: string;
    description: string;
    type: 'income' | 'expense';
  }) => Promise<boolean>;
  categories: string[];
  initialTransaction?: Transaction | null;
}

export default function AddTransactionModal({ isOpen, onClose, onSubmit, categories, initialTransaction }: AddTransactionModalProps) {
  const isEditing = !!initialTransaction;
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Food');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync form fields whenever the modal opens (prefill for edit, reset for add)
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (initialTransaction) {
      setAmount(String(initialTransaction.amount));
      setDate(initialTransaction.date);
      setType(initialTransaction.type);
      setDescription(initialTransaction.description || '');
      if (categories.includes(initialTransaction.category)) {
        setCategory(initialTransaction.category);
        setIsCustom(false);
        setCustomCategory('');
      } else {
        setIsCustom(true);
        setCustomCategory(initialTransaction.category);
      }
    } else {
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('Food');
      setCustomCategory('');
      setIsCustom(false);
      setDescription('');
      setType('expense');
    }
  }, [isOpen, initialTransaction]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }

    if (!date) {
      setError('Date is required.');
      return;
    }

    // Future date validation
    const selectedDate = new Date(date);
    const today = new Date();
    selectedDate.setHours(23, 59, 59, 999);
    if (selectedDate.getTime() > today.getTime()) {
      setError('Transaction date cannot be in the future.');
      return;
    }

    const transactionCategory = isCustom ? customCategory.trim() : category;
    if (!transactionCategory) {
      setError('Category is required.');
      return;
    }

    setLoading(true);
    try {
      const success = await onSubmit({
        amount: parsedAmount,
        date,
        category: transactionCategory,
        description,
        type,
      });

      if (success) {
        // Reset and close
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setCategory('Food');
        setCustomCategory('');
        setIsCustom(false);
        setDescription('');
        setType('expense');
        onClose();
      } else {
        setError('Failed to create transaction on server.');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="add-transaction-modal-overlay" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div id="add-transaction-modal-container" className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 flex flex-col md:max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-sans font-bold text-lg text-slate-900">{isEditing ? 'Edit Transaction' : 'New Transaction'}</h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">{isEditing ? 'Update this activity line in SQLite' : 'Post an activity line directly into SQLite'}</p>
          </div>
          <button 
            id="close-modal-btn"
            onClick={onClose}
            className="p-2 hover:bg-slate-150 rounded-full transition-colors text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 text-sm text-rose-600 font-sans font-medium flex items-center space-x-2">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Transaction Type Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              id="type-expense-btn"
              type="button"
              onClick={() => { setType('expense'); if (category === 'Salary') setCategory('Food'); }}
              className={`py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-250'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${type === 'expense' ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>Expense</span>
            </button>
            <button
              id="type-income-btn"
              type="button"
              onClick={() => { setType('income'); setCategory('Salary'); }}
              className={`py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-250'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${type === 'income' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>Income</span>
            </button>
          </div>

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Amount ($ USD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-sans font-medium text-lg">$</span>
              <input
                id="amount-input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full pl-8 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-slate-900 font-bold text-lg transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Transaction Date</label>
            <input
              id="date-input"
              type="date"
              max={new Date().toISOString().split('T')[0]} // Front Validation preventing future date picking
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-slate-900 transition-all font-semibold shadow-xs cursor-pointer"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
              <button
                id="toggle-custom-category"
                type="button"
                onClick={() => setIsCustom(!isCustom)}
                className="text-xs text-slate-500 hover:text-indigo-600 font-semibold transition-all cursor-pointer hover:underline"
              >
                {isCustom ? "Select category" : "Add custom"}
              </button>
            </div>

            {isCustom ? (
              <input
                id="custom-category-input"
                type="text"
                placeholder="e.g. Shopping, Subscription"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-slate-900 transition-all font-semibold shadow-xs"
              />
            ) : (
              <select
                id="category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-slate-900 transition-all font-semibold shadow-xs cursor-pointer"
                disabled={type === 'income'}
              >
                {type === 'income' ? (
                  <option value="Salary">Salary</option>
                ) : (
                  categories
                    .filter((c) => c !== 'Salary')
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))
                )}
              </select>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
            <input
              id="description-input"
              type="text"
              placeholder="Merchant info or details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-slate-900 transition-all shadow-xs"
            />
          </div>

          {/* Footer Save buttons */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
            <button
              id="cancel-modal-btn"
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200 flex items-center justify-center focus:outline-hidden cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-transaction-btn"
              type="submit"
              disabled={loading}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-semibold shadow-sm active:scale-98 transition-all flex items-center justify-center space-x-1.5 focus:outline-hidden cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isEditing ? 'Update Activity' : 'Save Activity'}</span>
                  <CornerDownLeft className="w-4 h-4 opacity-55" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
