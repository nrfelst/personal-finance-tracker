import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Plus,
  X,
  Search,
  Check,
  PenSquare,
  Trash2,
  TrendingUp,
  TrendingDown,
  Wallet
} from 'lucide-react';
import { InvestmentAccount, StockHolding, StockSearchResult } from '../types';

interface Props {
  account: InvestmentAccount;
  pricesLive: boolean;
  onBack: () => void;
  onAddHolding: (accountId: number, payload: { ticker: string; name: string; shares: number; cost_basis: number }) => Promise<boolean>;
  onUpdateHolding: (id: number, payload: { ticker: string; name: string; shares: number; cost_basis: number }) => Promise<boolean>;
  onDeleteHolding: (id: number) => Promise<boolean>;
  onSearchStocks: (q: string) => Promise<StockSearchResult[]>;
  onGetQuote: (symbol: string) => Promise<number | null>;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

export default function InvestmentAccountDetail({
  account,
  pricesLive,
  onBack,
  onAddHolding,
  onUpdateHolding,
  onDeleteHolding,
  onSearchStocks,
  onGetQuote
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<StockSearchResult | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [currentValue, setCurrentValue] = useState(''); // dollars you hold right now
  const [costBasis, setCostBasis] = useState('');        // optional: what you paid
  const [isAdding, setIsAdding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived share count from current value ÷ live price.
  const numCurrentValue = parseFloat(currentValue);
  const computedShares =
    livePrice && livePrice > 0 && !isNaN(numCurrentValue) && numCurrentValue > 0
      ? numCurrentValue / livePrice
      : null;

  // Edit form
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editShares, setEditShares] = useState('');
  const [editAmount, setEditAmount] = useState('');

  // Debounced symbol search
  useEffect(() => {
    if (selected || !query.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await onSearchStocks(query.trim());
        setResults(r);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected, onSearchStocks]);

  // When a stock is picked, fetch its live price so we can convert dollars → shares.
  useEffect(() => {
    if (!selected) {
      setLivePrice(null);
      return;
    }
    let cancelled = false;
    setLoadingPrice(true);
    setLivePrice(null);
    onGetQuote(selected.symbol)
      .then((p) => { if (!cancelled) setLivePrice(p); })
      .finally(() => { if (!cancelled) setLoadingPrice(false); });
    return () => { cancelled = true; };
  }, [selected, onGetQuote]);

  const resetAddForm = () => {
    setQuery('');
    setResults([]);
    setSelected(null);
    setLivePrice(null);
    setCurrentValue('');
    setCostBasis('');
  };

  const handleAdd = async () => {
    setError(null);
    if (!selected) {
      setError('Search and select a stock first.');
      return;
    }
    if (loadingPrice) {
      setError('Still fetching the live price — try again in a moment.');
      return;
    }
    if (!livePrice || livePrice <= 0) {
      setError('No live price available for this stock, so shares cannot be calculated.');
      return;
    }
    if (isNaN(numCurrentValue) || numCurrentValue <= 0) {
      setError('Enter the dollar amount you currently hold.');
      return;
    }
    const numShares = numCurrentValue / livePrice;
    // Cost basis is optional — default to the current value (gain starts at $0) if left blank.
    const numCost = costBasis.trim() === '' ? numCurrentValue : parseFloat(costBasis);
    if (isNaN(numCost) || numCost < 0) {
      setError('What you paid must be a non-negative number.');
      return;
    }
    setIsAdding(true);
    try {
      const ok = await onAddHolding(account.id, {
        ticker: selected.symbol,
        name: selected.description,
        shares: numShares,
        cost_basis: numCost
      });
      if (ok) {
        resetAddForm();
        setShowAddForm(false);
      } else {
        setError('Could not add holding.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (h: StockHolding) => {
    setEditingId(h.id);
    setEditShares(h.shares.toString());
    setEditAmount(h.costBasis.toString());
    setError(null);
  };

  const handleSaveEdit = async (h: StockHolding) => {
    setError(null);
    const numShares = parseFloat(editShares);
    const numAmount = parseFloat(editAmount);
    if (isNaN(numShares) || numShares <= 0) {
      setError('Shares must be a positive number.');
      return;
    }
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Amount must be a non-negative number.');
      return;
    }
    setBusyId(h.id);
    try {
      const ok = await onUpdateHolding(h.id, {
        ticker: h.ticker,
        name: h.name,
        shares: numShares,
        cost_basis: numAmount
      });
      if (ok) setEditingId(null);
      else setError('Could not update holding.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    setBusyId(id);
    try {
      const ok = await onDeleteHolding(id);
      if (!ok) setError('Could not delete holding.');
    } finally {
      setBusyId(null);
    }
  };

  const totalGain = account.holdings.reduce((s, h) => s + h.gain, 0);

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 text-xs font-semibold transition-all focus:outline-hidden cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          onClick={() => { setShowAddForm((v) => !v); setError(null); resetAddForm(); }}
          className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors focus:outline-hidden cursor-pointer"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddForm ? 'Close' : 'Add Stock'}</span>
        </button>
      </div>

      {/* Account summary */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-6 text-white shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-4 -translate-y-4 blur-xl" />
        <p className="text-xs text-indigo-100 font-sans uppercase tracking-wider font-semibold">{account.type}</p>
        <h2 className="font-sans font-bold text-2xl text-white mt-0.5">{account.name}</h2>
        <p className="font-sans font-bold text-3xl text-white mt-3">{formatCurrency(account.totalValue)}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-sans text-indigo-100">
          <span>Stocks: {formatCurrency(account.holdingsValue)}</span>
          <span>Cash/other: {formatCurrency(account.amount)}</span>
          {account.holdings.length > 0 && (
            <span className={totalGain >= 0 ? 'text-emerald-200' : 'text-rose-200'}>
              {totalGain >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(totalGain))} total gain
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-rose-600 font-sans font-medium shadow-xs">
          {error}
        </div>
      )}

      {!pricesLive && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-sans">
          Live prices are off (no FINNHUB_API_KEY set) — values shown reflect the amount you entered, not the live market.
        </div>
      )}

      {/* Add stock form */}
      {showAddForm && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
          {!selected ? (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ticker or company (e.g. AAPL, Apple)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-sans text-sm text-slate-900 transition-all"
                autoFocus
              />
              {(searching || results.length > 0) && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searching && <div className="px-3 py-2 text-xs text-slate-400 font-sans">Searching…</div>}
                  {!searching && results.map((r) => (
                    <button
                      key={r.symbol}
                      onClick={() => { setSelected(r); setResults([]); }}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors focus:outline-hidden cursor-pointer border-b border-slate-50 last:border-0"
                    >
                      <span className="font-mono font-bold text-sm text-slate-900">{r.symbol}</span>
                      <span className="font-sans text-xs text-slate-500 ml-2">{r.description}</span>
                    </button>
                  ))}
                  {!searching && results.length === 0 && query.trim() && (
                    <div className="px-3 py-2 text-xs text-slate-400 font-sans">No matches.</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <span className="font-mono font-bold text-sm text-slate-900">{selected.symbol}</span>
                <span className="font-sans text-xs text-slate-500 ml-2 truncate">{selected.description}</span>
              </div>
              <button
                onClick={() => { setSelected(null); setQuery(''); }}
                className="p-1 hover:bg-white rounded text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer shrink-0"
                title="Change stock"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Live price hint once a stock is selected */}
          {selected && (
            <p className="text-xs font-sans text-slate-500">
              {loadingPrice
                ? 'Fetching live price…'
                : livePrice
                  ? <>Live price: <span className="font-mono font-semibold text-slate-700">{formatCurrency(livePrice)}</span> / share</>
                  : <span className="text-amber-600">No live price available — can't auto-calculate shares for this stock.</span>}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-sans text-sm font-semibold">$</span>
              <input
                type="number"
                placeholder="Amount you hold now"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                className="w-full pl-7 pr-2 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-mono text-sm text-slate-900 transition-all font-bold"
                disabled={isAdding}
              />
            </div>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-sans text-sm font-semibold">$</span>
              <input
                type="number"
                placeholder="What you paid (optional)"
                value={costBasis}
                onChange={(e) => setCostBasis(e.target.value)}
                className="w-full pl-7 pr-2 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-mono text-sm text-slate-900 transition-all font-bold"
                disabled={isAdding}
              />
            </div>
          </div>

          {/* Auto-calculated shares */}
          {computedShares !== null && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs font-sans text-indigo-800">
              ≈ <span className="font-mono font-bold">{computedShares.toFixed(4)}</span> shares
              <span className="text-indigo-400"> ({formatCurrency(numCurrentValue)} ÷ {formatCurrency(livePrice!)})</span>
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors focus:outline-hidden cursor-pointer flex items-center justify-center"
          >
            {isAdding ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : 'Add Stock'}
          </button>
        </div>
      )}

      {/* Holdings list */}
      <div className="space-y-3">
        {account.holdings.length === 0 && !showAddForm && (
          <div className="bg-white rounded-xl p-8 border border-dashed border-slate-300 text-center">
            <Wallet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-sans text-slate-500">No stocks in this account yet.</p>
            <p className="text-xs font-sans text-slate-400 mt-0.5">Tap "Add Stock" to search and add one.</p>
          </div>
        )}

        {account.holdings.map((h) => {
          const isEditing = editingId === h.id;
          const up = h.gain >= 0;
          return (
            <div key={h.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="font-mono font-bold text-sm text-slate-900">{h.ticker} <span className="font-sans font-normal text-xs text-slate-500">{h.name}</span></div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="number"
                      value={editShares}
                      onChange={(e) => setEditShares(e.target.value)}
                      placeholder="Shares"
                      className="flex-1 px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-mono text-sm text-slate-900 transition-all font-bold"
                      disabled={busyId === h.id}
                    />
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-sans text-sm font-semibold">$</span>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        placeholder="Amount invested"
                        className="w-full pl-7 pr-2 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg outline-hidden font-mono text-sm text-slate-900 transition-all font-bold"
                        disabled={busyId === h.id}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSaveEdit(h)}
                      disabled={busyId === h.id}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors focus:outline-hidden cursor-pointer"
                    >
                      {busyId === h.id ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : <Check className="w-3.5 h-3.5" />}
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
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">{h.ticker}</span>
                      {h.changePercent !== null && (
                        <span className={`flex items-center text-[11px] font-mono font-bold ${h.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {h.changePercent >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                          {h.changePercent >= 0 ? '+' : ''}{h.changePercent.toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <p className="font-sans text-xs text-slate-400 truncate mt-0.5">{h.name}</p>
                    <p className="font-mono text-xs text-slate-500 mt-1">
                      {h.shares} sh{h.price !== null ? ` × ${formatCurrency(h.price)}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold text-sm text-slate-900">{formatCurrency(h.marketValue)}</p>
                    <p className={`font-mono text-xs font-semibold mt-0.5 ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {up ? '+' : ''}{formatCurrency(h.gain)}
                    </p>
                    <div className="flex items-center justify-end space-x-1.5 mt-2">
                      <button
                        onClick={() => startEdit(h)}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-all focus:outline-hidden cursor-pointer"
                        title="Edit holding"
                      >
                        <PenSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(h.id)}
                        disabled={busyId === h.id}
                        className="p-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-slate-400 hover:text-rose-600 transition-all focus:outline-hidden cursor-pointer"
                        title="Delete holding"
                      >
                        {busyId === h.id ? <span className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin block" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
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
