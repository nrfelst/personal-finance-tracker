import React, { useState } from 'react';
import {
  TrendingUp,
  Plus,
  X,
  Check,
  PenSquare,
  Trash2,
  Landmark,
  Wallet,
  ChevronRight
} from 'lucide-react';
import { InvestmentsData, InvestmentAccount, StockSearchResult } from '../types';
import InvestmentAccountDetail from './InvestmentAccountDetail';

interface InvestmentsViewProps {
  data: InvestmentsData;
  onAddInvestment: (name: string, type: string, amount: number) => Promise<boolean>;
  onUpdateInvestment: (id: number, name: string, type: string, amount: number) => Promise<boolean>;
  onDeleteInvestment: (id: number) => Promise<boolean>;
  onAddHolding: (accountId: number, payload: { ticker: string; name: string; shares: number; cost_basis: number }) => Promise<boolean>;
  onUpdateHolding: (id: number, payload: { ticker: string; name: string; shares: number; cost_basis: number }) => Promise<boolean>;
  onDeleteHolding: (id: number) => Promise<boolean>;
  onSearchStocks: (q: string) => Promise<StockSearchResult[]>;
  onGetQuote: (symbol: string) => Promise<number | null>;
}

const PRESET_TYPES = ['401k', 'Roth IRA', 'Traditional IRA', 'Individual / Brokerage', 'HSA'];
const CUSTOM_OPTION = 'Custom…';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

export default function InvestmentsView({
  data,
  onAddInvestment,
  onUpdateInvestment,
  onDeleteInvestment,
  onAddHolding,
  onUpdateHolding,
  onDeleteHolding,
  onSearchStocks,
  onGetQuote
}: InvestmentsViewProps) {
  const { accounts, total, byType } = data;

  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [typeChoice, setTypeChoice] = useState(PRESET_TYPES[0]);
  const [customType, setCustomType] = useState('');
  const [amount, setAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Edit form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editTypeChoice, setEditTypeChoice] = useState(PRESET_TYPES[0]);
  const [editCustomType, setEditCustomType] = useState('');
  const [editAmount, setEditAmount] = useState('');

  // NOTE: All hooks must be declared above any early return (Rules of Hooks).
  const selectedAccount = selectedAccountId !== null
    ? accounts.find((a) => a.id === selectedAccountId) || null
    : null;

  if (selectedAccount) {
    return (
      <InvestmentAccountDetail
        account={selectedAccount}
        pricesLive={data.pricesLive}
        onBack={() => setSelectedAccountId(null)}
        onAddHolding={onAddHolding}
        onUpdateHolding={onUpdateHolding}
        onDeleteHolding={onDeleteHolding}
        onSearchStocks={onSearchStocks}
        onGetQuote={onGetQuote}
      />
    );
  }

  const resolveType = (choice: string, custom: string) =>
    choice === CUSTOM_OPTION ? custom.trim() : choice;

  const handleAdd = async () => {
    setError(null);
    const finalType = resolveType(typeChoice, customType);
    const numAmount = parseFloat(amount);
    if (!name.trim()) {
      setError('Account name is required.');
      return;
    }
    if (!finalType) {
      setError('Account type is required.');
      return;
    }
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Amount must be a non-negative number.');
      return;
    }
    setIsAdding(true);
    try {
      const ok = await onAddInvestment(name.trim(), finalType, numAmount);
      if (ok) {
        setName('');
        setTypeChoice(PRESET_TYPES[0]);
        setCustomType('');
        setAmount('');
        setShowAddForm(false);
      } else {
        setError('Could not add account.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (acc: InvestmentAccount) => {
    setEditingId(acc.id);
    setEditName(acc.name);
    if (PRESET_TYPES.includes(acc.type)) {
      setEditTypeChoice(acc.type);
      setEditCustomType('');
    } else {
      setEditTypeChoice(CUSTOM_OPTION);
      setEditCustomType(acc.type);
    }
    setEditAmount(acc.amount.toString());
    setError(null);
  };

  const handleSaveEdit = async (id: number) => {
    setError(null);
    const finalType = resolveType(editTypeChoice, editCustomType);
    const numAmount = parseFloat(editAmount);
    if (!editName.trim()) {
      setError('Account name is required.');
      return;
    }
    if (!finalType) {
      setError('Account type is required.');
      return;
    }
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Amount must be a non-negative number.');
      return;
    }
    setBusyId(id);
    try {
      const ok = await onUpdateInvestment(id, editName.trim(), finalType, numAmount);
      if (ok) {
        setEditingId(null);
      } else {
        setError('Could not update account.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    setBusyId(id);
    try {
      const ok = await onDeleteInvestment(id);
      if (!ok) setError('Could not delete account.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div id="investments-view-container" className="space-y-6 max-w-lg mx-auto pb-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-sans font-bold text-slate-900 text-2xl tracking-tight">Investments</h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Track balances across your investment accounts</p>
        </div>
        <button
          id="toggle-add-investment-btn"
          onClick={() => { setShowAddForm((v) => !v); setError(null); }}
          className="shrink-0 flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors focus:outline-hidden cursor-pointer"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddForm ? 'Close' : 'Add Account'}</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-rose-600 font-sans font-medium shadow-xs">
          {error}
        </div>
      )}

      {/* Total card */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-6 text-white shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-4 -translate-y-4 blur-xl" />
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/15 rounded-xl">
            <TrendingUp className="w-6 h-6 text-indigo-100" />
          </div>
          <div>
            <p className="text-xs text-indigo-100 font-sans uppercase tracking-wider font-semibold">Total Invested</p>
            <h4 className="font-sans font-bold text-3xl text-white mt-0.5">{formatCurrency(total)}</h4>
          </div>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
          <input
            id="new-investment-name-input"
            type="text"
            placeholder="Account name (e.g. Growmark 401k)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-sm text-slate-900 transition-all"
            disabled={isAdding}
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              id="new-investment-type-select"
              value={typeChoice}
              onChange={(e) => setTypeChoice(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-sm text-slate-900 transition-all cursor-pointer"
              disabled={isAdding}
            >
              {PRESET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              <option value={CUSTOM_OPTION}>{CUSTOM_OPTION}</option>
            </select>
            <div className="relative sm:w-40">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-sans text-sm font-semibold">$</span>
              <input
                id="new-investment-amount-input"
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-2 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-mono text-sm text-slate-900 transition-all font-bold"
                disabled={isAdding}
              />
            </div>
          </div>
          {typeChoice === CUSTOM_OPTION && (
            <input
              id="new-investment-custom-type-input"
              type="text"
              placeholder="Custom type name"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-sm text-slate-900 transition-all"
              disabled={isAdding}
            />
          )}
          <button
            id="confirm-add-investment-btn"
            onClick={handleAdd}
            disabled={isAdding}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors focus:outline-hidden cursor-pointer flex items-center justify-center"
          >
            {isAdding ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : 'Add Account'}
          </button>
        </div>
      )}

      {/* Breakdown by type */}
      {byType.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2">
            <Landmark className="w-4 h-4 text-indigo-600" />
            <h3 className="font-sans font-bold text-slate-800 text-sm">By Type</h3>
          </div>
          <div className="space-y-2.5">
            {byType.map((b) => {
              const pct = total > 0 ? (b.amount / total) * 100 : 0;
              return (
                <div key={b.type} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-sans">
                    <span className="font-semibold text-slate-700">{b.type}</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(b.amount)} <span className="text-slate-400 font-medium">({pct.toFixed(0)}%)</span></span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Accounts list */}
      <div className="space-y-4">
        {accounts.length === 0 && !showAddForm && (
          <div className="bg-white rounded-xl p-8 border border-dashed border-slate-300 text-center">
            <Wallet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-sans text-slate-500">No investment accounts yet.</p>
            <p className="text-xs font-sans text-slate-400 mt-0.5">Tap "Add Account" to track your first one.</p>
          </div>
        )}

        {accounts.map((acc) => {
          const isEditing = editingId === acc.id;
          return (
            <div
              key={acc.id}
              id={`investment-item-${acc.id}`}
              className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all"
            >
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-sm text-slate-900 transition-all"
                    disabled={busyId === acc.id}
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={editTypeChoice}
                      onChange={(e) => setEditTypeChoice(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-sm text-slate-900 transition-all cursor-pointer"
                      disabled={busyId === acc.id}
                    >
                      {PRESET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      <option value={CUSTOM_OPTION}>{CUSTOM_OPTION}</option>
                    </select>
                    <div className="relative sm:w-40">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-sans text-sm font-semibold">$</span>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full pl-7 pr-2 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-mono text-sm text-slate-900 transition-all font-bold"
                        disabled={busyId === acc.id}
                      />
                    </div>
                  </div>
                  {editTypeChoice === CUSTOM_OPTION && (
                    <input
                      type="text"
                      placeholder="Custom type name"
                      value={editCustomType}
                      onChange={(e) => setEditCustomType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-sm text-slate-900 transition-all"
                      disabled={busyId === acc.id}
                    />
                  )}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSaveEdit(acc.id)}
                      disabled={busyId === acc.id}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors focus:outline-hidden cursor-pointer"
                    >
                      {busyId === acc.id ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors focus:outline-hidden cursor-pointer text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setSelectedAccountId(acc.id)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left focus:outline-hidden cursor-pointer group"
                    title="Open account"
                  >
                    <div className="min-w-0">
                      <p className="font-sans font-bold text-slate-800 text-sm truncate group-hover:text-indigo-600 transition-colors">{acc.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-sans font-semibold">{acc.type}</span>
                        {acc.holdings.length > 0 && (
                          <span className="text-[11px] font-sans text-slate-400">{acc.holdings.length} stock{acc.holdings.length === 1 ? '' : 's'}</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-auto text-right shrink-0">
                      <span className="font-mono font-bold text-slate-900 text-sm block">{formatCurrency(acc.totalValue)}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0" />
                  </button>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => startEdit(acc)}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-400 hover:text-indigo-600 transition-all focus:outline-hidden cursor-pointer"
                      title="Edit account"
                    >
                      <PenSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      disabled={busyId === acc.id}
                      className="p-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-slate-400 hover:text-rose-600 transition-all focus:outline-hidden cursor-pointer"
                      title="Delete account"
                    >
                      {busyId === acc.id ? <span className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin block" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
