-- Schema for Personal Finance Tracker SQLite Database
-- Created for Java Spring Boot Rest API / Node.js Express Backend

-- Drop existing tables if they exist
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS holdings;
DROP TABLE IF EXISTS investments;

-- Categories Table
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    budget_limit REAL NOT NULL
);

-- Investments Table (user-managed investment accounts)
CREATE TABLE investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL
);

-- Stock Holdings Table (individual stock positions within an investment account)
CREATE TABLE holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investment_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    name TEXT NOT NULL,
    shares REAL NOT NULL,
    cost_basis REAL NOT NULL,
    FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE
);

-- Transactions Table
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense'))
);

-- Seed Categories
INSERT INTO categories (name, budget_limit) VALUES ('Housing', 1000.00);
INSERT INTO categories (name, budget_limit) VALUES ('Food', 600.00);
INSERT INTO categories (name, budget_limit) VALUES ('Transport', 405.00);
INSERT INTO categories (name, budget_limit) VALUES ('Health', 300.00);
INSERT INTO categories (name, budget_limit) VALUES ('Entertain', 250.00);
INSERT INTO categories (name, budget_limit) VALUES ('Utilities', 400.00);

-- No seed transactions: a fresh database starts empty so every value (balance,
-- income, expenses, investments) begins at $0 — the same state as the in-app
-- "Clear all data" button. Users add their own transactions.
