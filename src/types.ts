export interface Transaction {
  id: number;
  amount: number;
  date: string;
  category: string;
  description: string;
  type: 'income' | 'expense';
}

export interface CategoryBudget {
  id: number;
  name: string;
  budgetLimit: number;
  spent: number;
}

export interface CategorySpend {
  category: string;
  total: number;
}

export interface MonthlySpend {
  month: string;
  total: number;
}

export interface StockHolding {
  id: number;
  investmentId: number;
  ticker: string;
  name: string;
  shares: number;
  costBasis: number;
  // Live fields (computed server-side from the cached quote; may be null if unavailable)
  price: number | null;
  marketValue: number;
  gain: number;
  changePercent: number | null;
}

export interface InvestmentAccount {
  id: number;
  name: string;
  type: string;
  amount: number;
  holdings: StockHolding[];
  holdingsValue: number;
  totalValue: number;
}

export interface InvestmentTypeBreakdown {
  type: string;
  amount: number;
}

export interface InvestmentsData {
  accounts: InvestmentAccount[];
  total: number;
  byType: InvestmentTypeBreakdown[];
  pricesLive: boolean;
  lastUpdated: string | null;
}

export interface StockSearchResult {
  symbol: string;
  description: string;
}
