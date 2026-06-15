import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import sqlite3 from "sqlite3";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load .env.local first (where Clerk/Finnhub keys live), then .env as a fallback.
// dotenv does not override already-set vars, so .env.local takes precedence.
dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "finance_tracker.db");
const SCHEMA_PATH = path.join(process.cwd(), "schema.sql");

app.use(express.json());

// Enable CORS for external access (dynamically reflecting the requester origin)
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Initialize sqlite3 database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Failed to connect to SQLite database:", err.message);
  } else {
    console.log("Connected to SQLite database at:", DB_PATH);
    initializeDatabase();
  }
});

// Helper function to execute sqlite run sequentially
function runQuery(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: any, err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Helper function to extract all records
function allQuery(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Helper function to retrieve a single row
function getQuery(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Database Initializer
async function initializeDatabase() {
  try {
    // Check if the tables exist
    const tableCheck = await getQuery(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'"
    );

    if (!tableCheck) {
      console.log("Initializing database with schema.sql...");
      if (fs.existsSync(SCHEMA_PATH)) {
        const schemaSql = fs.readFileSync(SCHEMA_PATH, "utf8");
        // Split schema by semicolon to run statements individually, avoiding compound command errors in node-sqlite3
        const statements = schemaSql
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const statement of statements) {
          await runQuery(statement);
        }
        console.log("Database schema and seed records successfully initialized.");
      } else {
        console.warn("schema.sql not found! Running default schema creation...");
        await runQuery(`
          CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            budget_limit REAL NOT NULL
          )
        `);
        await runQuery(`
          CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL CHECK (type IN ('income', 'expense'))
          )
        `);
      }
    } else {
      console.log("Database tables already exist. Skipping seed execution.");
    }

    // Always ensure the investments table exists (added after initial release,
    // so existing databases need it created on startup).
    await runQuery(`
      CREATE TABLE IF NOT EXISTS investments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL
      )
    `);

    // Stock holdings belong to an investment account. Deleting the account removes its holdings.
    await runQuery(`
      CREATE TABLE IF NOT EXISTS holdings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        investment_id INTEGER NOT NULL,
        ticker TEXT NOT NULL,
        name TEXT NOT NULL,
        shares REAL NOT NULL,
        cost_basis REAL NOT NULL,
        FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE
      )
    `);
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}

// ========================
// LIVE STOCK PRICES (Finnhub)
// ========================

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "";
const FINNHUB_BASE = "https://finnhub.io/api/v1";
// One quote is refreshed per tick, rotating through all held tickers, so calls are
// spread evenly over time instead of bursting (keeps us well under the free-tier limit).
const QUOTE_REFRESH_INTERVAL_MS = 6000;

interface CachedQuote {
  price: number;
  changePercent: number | null;
  updatedAt: number;
}

const priceCache = new Map<string, CachedQuote>();
let lastPriceUpdate: number | null = null;
let rotationIndex = 0;

async function fetchQuote(ticker: string): Promise<CachedQuote | null> {
  if (!FINNHUB_API_KEY) return null;
  try {
    const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_API_KEY}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data: any = await resp.json();
    // Finnhub returns c=current price, dp=percent change. c===0 means unknown symbol.
    if (typeof data.c !== "number" || data.c === 0) return null;
    return {
      price: data.c,
      changePercent: typeof data.dp === "number" ? data.dp : null,
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// Refresh a single ticker per tick, rotating through the distinct held tickers.
async function refreshNextQuote() {
  if (!FINNHUB_API_KEY) return;
  try {
    const rows = await allQuery("SELECT DISTINCT ticker FROM holdings");
    if (rows.length === 0) return;
    const ticker = rows[rotationIndex % rows.length].ticker;
    rotationIndex = (rotationIndex + 1) % rows.length;
    const quote = await fetchQuote(ticker);
    if (quote) {
      priceCache.set(ticker.toUpperCase(), quote);
      lastPriceUpdate = quote.updatedAt;
    }
  } catch (err) {
    // Swallow errors so the interval keeps running.
  }
}

function startPriceRefresher() {
  if (!FINNHUB_API_KEY) {
    console.warn("FINNHUB_API_KEY not set — live stock prices are disabled. Holdings will show cost basis only.");
    return;
  }
  setInterval(refreshNextQuote, QUOTE_REFRESH_INTERVAL_MS);
}

// ========================
// REST API ENDPOINTS
// ========================

const registerRoutes = (router: express.Express) => {
  // 1. GET /transactions — return all transactions ordered by date descending
  const getTransactions = async (req: Request, res: Response) => {
    try {
      const rows = await allQuery("SELECT * FROM transactions ORDER BY date DESC, id DESC");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.get("/transactions", getTransactions);
  router.get("/api/transactions", getTransactions);

  // 4. GET /transactions/summary — return total income, total expenses, and net balance
  const getSummary = async (req: Request, res: Response) => {
    try {
      const result = await getQuery(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpenses
        FROM transactions
      `);

      const totalIncome = result.totalIncome || 0;
      const totalExpenses = result.totalExpenses || 0;
      const netBalance = totalIncome - totalExpenses;

      res.json({
        totalIncome,
        totalExpenses,
        netBalance,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.get("/transactions/summary", getSummary);
  router.get("/api/transactions/summary", getSummary);

  // 5. GET /transactions/by-category — return total spending grouped by category
  const getByCategory = async (req: Request, res: Response) => {
    try {
      const rows = await allQuery(`
        SELECT category, SUM(amount) as total 
        FROM transactions 
        WHERE type = 'expense' 
        GROUP BY category
        ORDER BY total DESC
      `);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.get("/transactions/by-category", getByCategory);
  router.get("/api/transactions/by-category", getByCategory);

  // 6. GET /transactions/monthly — return total spending per month for the last 6 months
  const getMonthlySpending = async (req: Request, res: Response) => {
    try {
      // In SQLite, format date to YYYY-MM using SUBSTR(date, 1, 7)
      // Retrieve the monthly sums for the last 6 months
      const rows = await allQuery(`
        SELECT 
          SUBSTR(date, 1, 7) as month,
          SUM(amount) as total
        FROM transactions
        WHERE type = 'expense'
        GROUP BY month
        ORDER BY month DESC
        LIMIT 6
      `);
      // Since it's sorted DESC (recent first), let's reverse to make it chronologically ASC
      res.json(rows.reverse());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.get("/transactions/monthly", getMonthlySpending);
  router.get("/api/transactions/monthly", getMonthlySpending);

  // 2. GET /transactions/{id} — return a single transaction by ID
  const getTransactionById = async (req: Request, res: Response) => {
    try {
      const row = await getQuery("SELECT * FROM transactions WHERE id = ?", [req.params.id]);
      if (!row) {
        return res.status(404).json({ error: `Transaction with ID ${req.params.id} not found.` });
      }
      res.json(row);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.get("/transactions/:id", getTransactionById);
  router.get("/api/transactions/:id", getTransactionById);

  // 3. POST /transactions — add a new transaction (accept JSON body)
  const postTransaction = async (req: Request, res: Response) => {
    const { amount, date, category, description, type } = req.body;

    // Basic Input Validation
    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: "Amount is required." });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number." });
    }

    if (!date) {
      return res.status(400).json({ error: "Date is required." });
    }
    // Check for future date (Format: YYYY-MM-DD or full date string)
    const inputDate = new Date(date);
    const currentDate = new Date();
    // Normalize time to compare dates only
    inputDate.setHours(23, 59, 59, 999); 
    if (inputDate.getTime() > currentDate.getTime()) {
      return res.status(400).json({ error: "Transaction date cannot be in the future." });
    }

    if (!category || typeof category !== "string") {
      return res.status(400).json({ error: "Category is required and must be a string." });
    }

    if (!type || (type !== "income" && type !== "expense")) {
      return res.status(400).json({ error: "Type must be either 'income' or 'expense'." });
    }

    try {
      // If adding an expense, check if the category exists. If not, auto-create it with a default budget limit of $500
      if (type === "expense") {
        const catCheck = await getQuery("SELECT name FROM categories WHERE name = ?", [category]);
        if (!catCheck) {
          await runQuery("INSERT OR IGNORE INTO categories (name, budget_limit) VALUES (?, ?)", [
            category,
            500.00,
          ]);
        }
      }

      const result = await runQuery(
        "INSERT INTO transactions (amount, date, category, description, type) VALUES (?, ?, ?, ?, ?)",
        [numAmount, date, category, description || "", type]
      );

      const newTransaction = await getQuery("SELECT * FROM transactions WHERE id = ?", [result.lastID]);
      res.status(201).json(newTransaction);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.post("/transactions", postTransaction);
  router.post("/api/transactions", postTransaction);

  // PUT /transactions/{id} — update an existing transaction
  const updateTransaction = async (req: Request, res: Response) => {
    const { amount, date, category, description, type } = req.body;

    const numAmount = Number(amount);
    if (amount === undefined || amount === null || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number." });
    }
    if (!date) {
      return res.status(400).json({ error: "Date is required." });
    }
    const inputDate = new Date(date);
    const currentDate = new Date();
    inputDate.setHours(23, 59, 59, 999);
    if (inputDate.getTime() > currentDate.getTime()) {
      return res.status(400).json({ error: "Transaction date cannot be in the future." });
    }
    if (!category || typeof category !== "string") {
      return res.status(400).json({ error: "Category is required and must be a string." });
    }
    if (!type || (type !== "income" && type !== "expense")) {
      return res.status(400).json({ error: "Type must be either 'income' or 'expense'." });
    }

    try {
      const existing = await getQuery("SELECT id FROM transactions WHERE id = ?", [req.params.id]);
      if (!existing) {
        return res.status(404).json({ error: `Transaction with ID ${req.params.id} not found.` });
      }

      if (type === "expense") {
        const catCheck = await getQuery("SELECT name FROM categories WHERE name = ?", [category]);
        if (!catCheck) {
          await runQuery("INSERT OR IGNORE INTO categories (name, budget_limit) VALUES (?, ?)", [
            category,
            500.0,
          ]);
        }
      }

      await runQuery(
        "UPDATE transactions SET amount = ?, date = ?, category = ?, description = ?, type = ? WHERE id = ?",
        [numAmount, date, category, description || "", type, req.params.id]
      );

      const updated = await getQuery("SELECT * FROM transactions WHERE id = ?", [req.params.id]);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.put("/transactions/:id", updateTransaction);
  router.put("/api/transactions/:id", updateTransaction);

  // DELETE /transactions/{id} — delete a transaction by ID
  const deleteTransaction = async (req: Request, res: Response) => {
    try {
      const check = await getQuery("SELECT id FROM transactions WHERE id = ?", [req.params.id]);
      if (!check) {
        return res.status(404).json({ error: `Transaction with ID ${req.params.id} not found.` });
      }

      await runQuery("DELETE FROM transactions WHERE id = ?", [req.params.id]);
      res.json({ message: "Transaction successfully deleted.", id: req.params.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.delete("/transactions/:id", deleteTransaction);
  router.delete("/api/transactions/:id", deleteTransaction);

  // DELETE /transactions — clear all transactions (keeps category/budget definitions)
  const clearAllTransactions = async (req: Request, res: Response) => {
    try {
      const result = await runQuery("DELETE FROM transactions");
      res.json({ message: "All transactions cleared.", deleted: result.changes });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.delete("/transactions", clearAllTransactions);
  router.delete("/api/transactions", clearAllTransactions);

  // GET /budget — return each category with its budget limit and actual amount spent in the current month (or all-time fallback)
  const getBudget = async (req: Request, res: Response) => {
    try {
      // "Spent" reflects the most recent month that actually has transactions, so the
      // budget view stays meaningful even when the real-world calendar month has no data yet.
      const latest = await getQuery(
        "SELECT MAX(SUBSTR(date, 1, 7)) as month FROM transactions"
      );
      const currentYearMonth = (latest && latest.month) || new Date().toISOString().substring(0, 7);

      const budgets = await allQuery(`
        SELECT
          c.id,
          c.name,
          c.budget_limit as budgetLimit,
          COALESCE(SUM(CASE WHEN t.type = 'expense' AND SUBSTR(t.date, 1, 7) = ? THEN t.amount ELSE 0 END), 0) as spent
        FROM categories c
        LEFT JOIN transactions t ON LOWER(c.name) = LOWER(t.category)
        GROUP BY c.id, c.name, c.budget_limit
      `, [currentYearMonth]);

      res.json(budgets);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.get("/budget", getBudget);
  router.get("/api/budget", getBudget);

  // PUT /budget/{categoryId} — update the budget limit for a category
  const putBudget = async (req: Request, res: Response) => {
    const { budget_limit } = req.body;
    const { categoryId } = req.params;

    if (budget_limit === undefined || budget_limit === null) {
      return res.status(400).json({ error: "budget_limit field is required." });
    }
    const numLimit = Number(budget_limit);
    if (isNaN(numLimit) || numLimit < 0) {
      return res.status(400).json({ error: "budget_limit must be a non-negative number." });
    }

    try {
      const check = await getQuery("SELECT id FROM categories WHERE id = ?", [categoryId]);
      if (!check) {
        return res.status(404).json({ error: `Category with ID ${categoryId} not found.` });
      }

      await runQuery("UPDATE categories SET budget_limit = ? WHERE id = ?", [numLimit, categoryId]);
      const updatedCategory = await getQuery("SELECT id, name, budget_limit as budgetLimit FROM categories WHERE id = ?", [categoryId]);
      res.json(updatedCategory);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.put("/budget/:categoryId", putBudget);
  router.put("/api/budget/:categoryId", putBudget);

  // POST /categories — create a new category with an optional budget limit
  const postCategory = async (req: Request, res: Response) => {
    const { name, budget_limit } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Category name is required." });
    }
    const numLimit = budget_limit === undefined || budget_limit === null ? 0 : Number(budget_limit);
    if (isNaN(numLimit) || numLimit < 0) {
      return res.status(400).json({ error: "budget_limit must be a non-negative number." });
    }

    try {
      const existing = await getQuery("SELECT id FROM categories WHERE LOWER(name) = LOWER(?)", [name.trim()]);
      if (existing) {
        return res.status(409).json({ error: `Category "${name.trim()}" already exists.` });
      }
      const result = await runQuery("INSERT INTO categories (name, budget_limit) VALUES (?, ?)", [name.trim(), numLimit]);
      const created = await getQuery("SELECT id, name, budget_limit as budgetLimit FROM categories WHERE id = ?", [result.lastID]);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.post("/categories", postCategory);
  router.post("/api/categories", postCategory);

  // DELETE /categories/{id} — remove a category (existing transactions are kept)
  const deleteCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const check = await getQuery("SELECT id FROM categories WHERE id = ?", [id]);
      if (!check) {
        return res.status(404).json({ error: `Category with ID ${id} not found.` });
      }
      await runQuery("DELETE FROM categories WHERE id = ?", [id]);
      res.json({ message: "Category deleted.", id: Number(id) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.delete("/categories/:id", deleteCategory);
  router.delete("/api/categories/:id", deleteCategory);

  // Build a holding object with live market value derived from the cached quote.
  // Falls back to cost basis when no live price is available (no API key / unknown symbol).
  const buildHolding = (row: any) => {
    const cached = priceCache.get(String(row.ticker).toUpperCase());
    const price = cached ? cached.price : null;
    const marketValue = price !== null ? price * row.shares : row.cost_basis;
    return {
      id: row.id,
      investmentId: row.investment_id,
      ticker: row.ticker,
      name: row.name,
      shares: row.shares,
      costBasis: row.cost_basis,
      price,
      marketValue,
      gain: marketValue - row.cost_basis,
      changePercent: cached ? cached.changePercent : null,
    };
  };

  // GET /investments — accounts (with their stock holdings + live values), total and per-type breakdown
  const getInvestments = async (req: Request, res: Response) => {
    try {
      const accountRows = await allQuery(
        "SELECT id, name, type, amount FROM investments ORDER BY type, name"
      );
      const holdingRows = await allQuery("SELECT * FROM holdings");

      const accounts = accountRows.map((a) => {
        const holdings = holdingRows.filter((h) => h.investment_id === a.id).map(buildHolding);
        const holdingsValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
        return {
          ...a,
          holdings,
          holdingsValue,
          totalValue: a.amount + holdingsValue,
        };
      });

      const total = accounts.reduce((sum, a) => sum + a.totalValue, 0);

      const byTypeMap: Record<string, number> = {};
      for (const a of accounts) {
        byTypeMap[a.type] = (byTypeMap[a.type] || 0) + a.totalValue;
      }
      const byType = Object.entries(byTypeMap).map(([type, amount]) => ({ type, amount }));

      res.json({
        accounts,
        total,
        byType,
        pricesLive: Boolean(FINNHUB_API_KEY),
        lastUpdated: lastPriceUpdate ? new Date(lastPriceUpdate).toISOString() : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.get("/investments", getInvestments);
  router.get("/api/investments", getInvestments);

  // GET /stocks/search?q= — proxy Finnhub symbol search (keeps the API key server-side)
  const searchStocks = async (req: Request, res: Response) => {
    const q = String(req.query.q || "").trim();
    if (!q) {
      return res.json({ results: [] });
    }
    if (!FINNHUB_API_KEY) {
      return res.status(503).json({ error: "Stock search is unavailable: FINNHUB_API_KEY is not set." });
    }
    try {
      const url = `${FINNHUB_BASE}/search?q=${encodeURIComponent(q)}&token=${FINNHUB_API_KEY}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        return res.status(502).json({ error: "Stock search provider error." });
      }
      const data: any = await resp.json();
      const results = (data.result || [])
        // Keep plain tickers (skip options/odd symbols with dots/colons) and cap the list.
        .filter((r: any) => r.symbol && !r.symbol.includes(".") && !r.symbol.includes(":"))
        .slice(0, 15)
        .map((r: any) => ({ symbol: r.symbol, description: r.description }));
      res.json({ results });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.get("/stocks/search", searchStocks);
  router.get("/api/stocks/search", searchStocks);

  // GET /stocks/quote?symbol= — current live price for one ticker (used to auto-calc shares from a dollar amount)
  const quoteStock = async (req: Request, res: Response) => {
    const symbol = String(req.query.symbol || "").trim().toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: "A 'symbol' query parameter is required." });
    }
    if (!FINNHUB_API_KEY) {
      return res.status(503).json({ error: "Live quotes are unavailable: FINNHUB_API_KEY is not set." });
    }
    const quote = await fetchQuote(symbol);
    if (!quote) {
      return res.status(404).json({ error: `No live price available for "${symbol}".` });
    }
    // Cache it so the holding shows a price immediately if added.
    priceCache.set(symbol, quote);
    res.json({ symbol, price: quote.price, changePercent: quote.changePercent });
  };
  router.get("/stocks/quote", quoteStock);
  router.get("/api/stocks/quote", quoteStock);

  // Shared validation for creating/updating an investment account
  const validateInvestment = (body: any): { name: string; type: string; amount: number } | string => {
    const { name, type, amount } = body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return "Account name is required.";
    }
    if (!type || typeof type !== "string" || !type.trim()) {
      return "Account type is required.";
    }
    if (amount === undefined || amount === null) {
      return "Amount is required.";
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return "Amount must be a non-negative number.";
    }
    return { name: name.trim(), type: type.trim(), amount: numAmount };
  };

  // POST /investments — add a new investment account
  const postInvestment = async (req: Request, res: Response) => {
    const result = validateInvestment(req.body);
    if (typeof result === "string") {
      return res.status(400).json({ error: result });
    }
    try {
      const inserted = await runQuery(
        "INSERT INTO investments (name, type, amount) VALUES (?, ?, ?)",
        [result.name, result.type, result.amount]
      );
      const created = await getQuery("SELECT id, name, type, amount FROM investments WHERE id = ?", [inserted.lastID]);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.post("/investments", postInvestment);
  router.post("/api/investments", postInvestment);

  // PUT /investments/{id} — update an investment account
  const updateInvestment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = validateInvestment(req.body);
    if (typeof result === "string") {
      return res.status(400).json({ error: result });
    }
    try {
      const check = await getQuery("SELECT id FROM investments WHERE id = ?", [id]);
      if (!check) {
        return res.status(404).json({ error: `Investment with ID ${id} not found.` });
      }
      await runQuery("UPDATE investments SET name = ?, type = ?, amount = ? WHERE id = ?", [result.name, result.type, result.amount, id]);
      const updated = await getQuery("SELECT id, name, type, amount FROM investments WHERE id = ?", [id]);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.put("/investments/:id", updateInvestment);
  router.put("/api/investments/:id", updateInvestment);

  // DELETE /investments/{id} — remove an investment account
  const deleteInvestment = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const check = await getQuery("SELECT id FROM investments WHERE id = ?", [id]);
      if (!check) {
        return res.status(404).json({ error: `Investment with ID ${id} not found.` });
      }
      await runQuery("DELETE FROM holdings WHERE investment_id = ?", [id]);
      await runQuery("DELETE FROM investments WHERE id = ?", [id]);
      res.json({ message: "Investment deleted.", id: Number(id) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.delete("/investments/:id", deleteInvestment);
  router.delete("/api/investments/:id", deleteInvestment);

  // Shared validation for creating/updating a stock holding
  const validateHolding = (body: any): { ticker: string; name: string; shares: number; costBasis: number } | string => {
    const { ticker, name, shares, cost_basis } = body;
    if (!ticker || typeof ticker !== "string" || !ticker.trim()) {
      return "Ticker is required.";
    }
    const numShares = Number(shares);
    if (isNaN(numShares) || numShares <= 0) {
      return "Shares must be a positive number.";
    }
    if (cost_basis === undefined || cost_basis === null) {
      return "Amount is required.";
    }
    const numCost = Number(cost_basis);
    if (isNaN(numCost) || numCost < 0) {
      return "Amount must be a non-negative number.";
    }
    return {
      ticker: ticker.trim().toUpperCase(),
      name: (name && typeof name === "string" && name.trim()) || ticker.trim().toUpperCase(),
      shares: numShares,
      costBasis: numCost,
    };
  };

  // POST /investments/{id}/holdings — add a stock holding to an account
  const postHolding = async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = validateHolding(req.body);
    if (typeof result === "string") {
      return res.status(400).json({ error: result });
    }
    try {
      const account = await getQuery("SELECT id FROM investments WHERE id = ?", [id]);
      if (!account) {
        return res.status(404).json({ error: `Investment account with ID ${id} not found.` });
      }
      const inserted = await runQuery(
        "INSERT INTO holdings (investment_id, ticker, name, shares, cost_basis) VALUES (?, ?, ?, ?, ?)",
        [id, result.ticker, result.name, result.shares, result.costBasis]
      );
      // Prime the price cache for a freshly added ticker so it shows a live value promptly.
      const quote = await fetchQuote(result.ticker);
      if (quote) {
        priceCache.set(result.ticker, quote);
        lastPriceUpdate = quote.updatedAt;
      }
      const row = await getQuery("SELECT * FROM holdings WHERE id = ?", [inserted.lastID]);
      res.status(201).json(buildHolding(row));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.post("/investments/:id/holdings", postHolding);
  router.post("/api/investments/:id/holdings", postHolding);

  // PUT /holdings/{id} — update a stock holding
  const updateHolding = async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = validateHolding(req.body);
    if (typeof result === "string") {
      return res.status(400).json({ error: result });
    }
    try {
      const existing = await getQuery("SELECT id FROM holdings WHERE id = ?", [id]);
      if (!existing) {
        return res.status(404).json({ error: `Holding with ID ${id} not found.` });
      }
      await runQuery(
        "UPDATE holdings SET ticker = ?, name = ?, shares = ?, cost_basis = ? WHERE id = ?",
        [result.ticker, result.name, result.shares, result.costBasis, id]
      );
      const row = await getQuery("SELECT * FROM holdings WHERE id = ?", [id]);
      res.json(buildHolding(row));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.put("/holdings/:id", updateHolding);
  router.put("/api/holdings/:id", updateHolding);

  // DELETE /holdings/{id} — remove a stock holding
  const deleteHolding = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const existing = await getQuery("SELECT id FROM holdings WHERE id = ?", [id]);
      if (!existing) {
        return res.status(404).json({ error: `Holding with ID ${id} not found.` });
      }
      await runQuery("DELETE FROM holdings WHERE id = ?", [id]);
      res.json({ message: "Holding deleted.", id: Number(id) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
  router.delete("/holdings/:id", deleteHolding);
  router.delete("/api/holdings/:id", deleteHolding);
};

// Register the standard and api versions of the endpoints
registerRoutes(app);

// Startup helper function
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Serve index.html in development with Vite transform to inject client assets
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const templatePath = path.resolve(process.cwd(), "index.html");
        let template = fs.readFileSync(templatePath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express SQLite server running on http://localhost:${PORT}`);
  });

  startPriceRefresher();
}

startServer();
