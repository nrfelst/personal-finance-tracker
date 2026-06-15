import React, { useState } from 'react';
import {
  PiggyBank,
  PenSquare,
  Check,
  X,
  FlameKindling,
  Plus,
  Trash2
} from 'lucide-react';
import { CategoryBudget } from '../types';

interface BudgetViewProps {
  budgets: CategoryBudget[];
  onUpdateBudgetLimit: (categoryId: number, budgetLimit: number) => Promise<boolean>;
  onAddCategory: (name: string, budgetLimit: number) => Promise<boolean>;
  onDeleteCategory: (categoryId: number) => Promise<boolean>;
}

export default function BudgetView({ budgets, onUpdateBudgetLimit, onAddCategory, onDeleteCategory }: BudgetViewProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLimit, setEditLimit] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleAddCategory = async () => {
    setError(null);
    const name = newName.trim();
    if (!name) {
      setError('Category name is required.');
      return;
    }
    const numLimit = newLimit === '' ? 0 : parseFloat(newLimit);
    if (isNaN(numLimit) || numLimit < 0) {
      setError('Allowance must be a non-negative number.');
      return;
    }
    setIsAdding(true);
    try {
      const success = await onAddCategory(name, numLimit);
      if (success) {
        setNewName('');
        setNewLimit('');
        setShowAddForm(false);
      } else {
        setError('Could not add category — it may already exist.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    setError(null);
    setDeletingId(id);
    try {
      const success = await onDeleteCategory(id);
      if (!success) {
        setError('Could not delete category.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartEdit = (cat: CategoryBudget) => {
    setEditingId(cat.id);
    setEditLimit(cat.budgetLimit.toString());
    setError(null);
  };

  const handleSaveBudget = async (id: number) => {
    setError(null);
    const numLimit = parseFloat(editLimit);
    if (isNaN(numLimit) || numLimit < 0) {
      setError('Allowances must be non-negative numbers.');
      return;
    }

    setIsUpdating(true);
    try {
      const success = await onUpdateBudgetLimit(id, numLimit);
      if (success) {
        setEditingId(null);
      } else {
        setError('Database update rejected.');
      }
    } catch (err: any) {
      setError(err?.message || 'Update failed.');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  return (
    <div id="budget-view-container" className="space-y-6 max-w-lg mx-auto pb-8">
      
      {/* Header text */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-sans font-bold text-slate-900 text-2xl tracking-tight">Category Allowances</h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Control, analyze and dynamically adjust monthly budget limits</p>
        </div>
        <button
          id="toggle-add-category-btn"
          onClick={() => { setShowAddForm((v) => !v); setError(null); }}
          className="shrink-0 flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors focus:outline-hidden cursor-pointer"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddForm ? 'Close' : 'Add Category'}</span>
        </button>
      </div>

      {/* Add Category form */}
      {showAddForm && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="new-category-name-input"
              type="text"
              placeholder="Category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-sm text-slate-900 transition-all"
              disabled={isAdding}
            />
            <div className="relative sm:w-36">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-sans text-sm font-semibold">$</span>
              <input
                id="new-category-limit-input"
                type="number"
                placeholder="Limit"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="w-full pl-7 pr-2 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-mono text-sm text-slate-900 transition-all font-bold"
                disabled={isAdding}
              />
            </div>
            <button
              id="confirm-add-category-btn"
              onClick={handleAddCategory}
              disabled={isAdding}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors focus:outline-hidden cursor-pointer flex items-center justify-center"
            >
              {isAdding ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : 'Add'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-rose-600 font-sans font-medium shadow-xs">
          {error}
        </div>
      )}

      {/* Aggregate Saving Insight banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-6 text-white shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-4 -translate-y-4 blur-xl" />
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/15 rounded-xl">
            <PiggyBank className="w-6 h-6 text-indigo-100 animate-pulse" />
          </div>
          <div>
            <h4 className="font-sans font-bold text-base text-white">Active Budget Controller</h4>
            <p className="text-xs text-indigo-100 font-sans mt-1">
              Limits are mapped dynamically against current calendar expenses under the SQLite engine. Keep track of limits on spending habits.
            </p>
          </div>
        </div>
      </div>

      {/* Budget Allowance Items List */}
      <div className="space-y-4">
        {budgets.map((budget) => {
          const spentPercent = budget.budgetLimit > 0 ? (budget.spent / budget.budgetLimit) * 100 : 0;
          const isOverLimit = budget.spent > budget.budgetLimit && budget.budgetLimit > 0;
          const isEditing = editingId === budget.id;

          return (
            <div 
              key={budget.id} 
              id={`budget-allowance-item-${budget.id}`}
              className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-4"
            >
              {/* Category Header Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className={`w-3 h-3 rounded-full ${
                    isOverLimit ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'
                  }`} />
                  <span className="font-sans font-bold text-slate-800 text-sm">{budget.name}</span>
                </div>

                {/* Edit Section Controllers */}
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-sans text-xs font-semibold">$</span>
                      <input
                        id={`budget-limit-edit-input-${budget.id}`}
                        type="number"
                        placeholder="Limit"
                        value={editLimit}
                        onChange={(e) => setEditLimit(e.target.value)}
                        className="w-24 pl-5 pr-2 py-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-md outline-hidden font-mono text-xs text-slate-900 transition-all font-bold"
                        disabled={isUpdating}
                        required
                      />
                    </div>
                    <button
                      id={`save-budget-btn-for-${budget.id}`}
                      onClick={() => handleSaveBudget(budget.id)}
                      disabled={isUpdating}
                      className="p-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md transition-colors focus:outline-hidden cursor-pointer"
                      title="Save limit"
                    >
                      {isUpdating ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      id={`cancel-budget-btn-for-${budget.id}`}
                      onClick={() => setEditingId(null)}
                      className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors focus:outline-hidden cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      id={`edit-budget-btn-for-${budget.id}`}
                      onClick={() => handleStartEdit(budget)}
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-500 hover:text-indigo-600 transition-all focus:outline-hidden text-xs font-semibold cursor-pointer"
                    >
                      <PenSquare className="w-3.5 h-3.5" />
                      <span>Edit Limit</span>
                    </button>
                    <button
                      id={`delete-budget-btn-for-${budget.id}`}
                      onClick={() => handleDeleteCategory(budget.id)}
                      disabled={deletingId === budget.id}
                      className="p-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-slate-400 hover:text-rose-600 transition-all focus:outline-hidden cursor-pointer"
                      title="Delete category"
                    >
                      {deletingId === budget.id ? <span className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin block" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Progress Line */}
              <div className="space-y-1.5">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      isOverLimit ? 'bg-gradient-to-r from-rose-500 to-rose-600' : 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                    }`}
                    style={{ width: `${Math.min(spentPercent, 100)}%` }}
                  />
                </div>
                
                {/* Spent Math Ledger text */}
                <div className="flex justify-between items-center text-xs font-mono">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-400">Spent:</span>
                    <span className={`font-bold ${isOverLimit ? 'text-rose-600' : 'text-slate-700'}`}>
                      {formatCurrency(budget.spent)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-400">Allowed:</span>
                    <span className="font-bold text-slate-950">{formatCurrency(budget.budgetLimit)}</span>
                  </div>
                </div>
              </div>

              {/* Exceeded alert tags */}
              {isOverLimit && (
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-center space-x-2 text-rose-700 font-sans text-xs font-medium animate-bounce">
                  <FlameKindling className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Warning: Spent ratio has exceeded allowance limit by {spentPercent.toFixed(1)}%!</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
