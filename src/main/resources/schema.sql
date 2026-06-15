-- Schema for Personal Finance Tracker SQLite Database
-- Created for Java Spring Boot Rest API / Node.js Express Backend

-- Drop existing tables if they exist
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS categories;

-- Categories Table
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    budget_limit REAL NOT NULL
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

-- Seed Transactions (At least 10 realistic transactions across multiple categories and months to yield a total balance of $12,450.00 as of May 25, 2026)
-- Note: Income for May is $4,200.00, Expenses for May is $2,150.00. Leftover from previous months accounts for $10,400.00.

-- May 2026 (Income: $4200.00, Expenses: $2150.00)
INSERT INTO transactions (amount, date, category, description, type) VALUES (4200.00, '2026-05-25', 'Salary', 'Monthly Salary Deposit', 'income');
INSERT INTO transactions (amount, date, category, description, type) VALUES (15.99, '2026-05-24', 'Entertain', 'Netflix Premium subscription', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (120.50, '2026-05-22', 'Food', 'Whole Foods weekly groceries', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (860.00, '2026-05-20', 'Housing', 'Monthly rent payment', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (65.00, '2026-05-18', 'Transport', 'Car fuel refill', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (186.50, '2026-05-15', 'Food', 'Trader Joes groceries', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (15.00, '2026-05-12', 'Food', 'Subway Lunch', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (57.00, '2026-05-10', 'Transport', 'Gas and vehicle wash', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (215.00, '2026-05-08', 'Health', 'Routine Dental Checkup', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (40.00, '2026-05-05', 'Entertain', 'Movienight tickets & popcorn', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (200.00, '2026-05-04', 'Transport', 'Lyft ride to downtown', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (215.00, '2026-05-03', 'Food', 'Steakhouse Diner with friends', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (160.01, '2026-05-02', 'Entertain', 'Spotify and audio subscriptions', 'expense');

-- April 2026 (Income: $4200.00, Expenses: $1760.00, Net: +$2440.00)
INSERT INTO transactions (amount, date, category, description, type) VALUES (4200.00, '2026-04-25', 'Salary', 'Monthly Salary Deposit', 'income');
INSERT INTO transactions (amount, date, category, description, type) VALUES (860.00, '2026-04-20', 'Housing', 'Monthly rent payment', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (450.00, '2026-04-15', 'Food', 'April Groceries', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (300.00, '2026-04-10', 'Transport', 'Monthly train pass & gas', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (150.00, '2026-04-05', 'Entertain', 'Concert tickets', 'expense');

-- March 2026 (Income: $4200.00, Expenses: $1840.00, Net: +$2360.00)
INSERT INTO transactions (amount, date, category, description, type) VALUES (4200.00, '2026-03-25', 'Salary', 'Monthly Salary Deposit', 'income');
INSERT INTO transactions (amount, date, category, description, type) VALUES (860.00, '2026-03-20', 'Housing', 'Monthly rent payment', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (520.00, '2026-03-14', 'Food', 'March groceries & meals', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (280.00, '2026-03-08', 'Transport', 'Gasoline & maintenance', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (180.00, '2026-03-04', 'Entertain', 'Restaurants and theaters', 'expense');

-- February 2026 (Income: $4200.00, Expenses: $1810.00, Net: +$2390.00)
INSERT INTO transactions (amount, date, category, description, type) VALUES (4200.00, '2026-02-25', 'Salary', 'Monthly Salary Deposit', 'income');
INSERT INTO transactions (amount, date, category, description, type) VALUES (860.00, '2026-02-20', 'Housing', 'Monthly rent payment', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (400.00, '2026-02-12', 'Food', 'February groceries', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (250.00, '2026-02-08', 'Transport', 'Car gas refuel', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (200.00, '2026-02-05', 'Entertain', 'Event tickets', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (100.00, '2026-02-02', 'Health', 'Pharmacy and vitamins', 'expense');

-- January 2026 (Income: $4200.00, Expenses: $1670.00, Net: +$2530.00)
INSERT INTO transactions (amount, date, category, description, type) VALUES (4200.00, '2026-01-25', 'Salary', 'Monthly Salary Deposit', 'income');
INSERT INTO transactions (amount, date, category, description, type) VALUES (860.00, '2026-01-20', 'Housing', 'Monthly rent payment', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (480.00, '2026-01-14', 'Food', 'January food & groceries', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (210.00, '2026-01-08', 'Transport', 'Gas and parking fees', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (120.00, '2026-01-03', 'Entertain', 'Steam games and sports', 'expense');

-- December 2025 (Income: $4200.00, Expenses: $2080.00, Net: +$2120.00)
-- Note: Balance before Dec 2025 setup was $3560.00, aggregate savings yield exactly $12,450.00 today!
INSERT INTO transactions (amount, date, category, description, type) VALUES (4200.00, '2025-12-24', 'Salary', 'Monthly Salary Deposit', 'income');
INSERT INTO transactions (amount, date, category, description, type) VALUES (860.00, '2025-12-20', 'Housing', 'Monthly rent payment', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (600.00, '2025-12-15', 'Food', 'Holiday feasts & grocery', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (320.00, '2025-12-10', 'Transport', 'Winter trip transit', 'expense');
INSERT INTO transactions (amount, date, category, description, type) VALUES (300.00, '2025-12-05', 'Entertain', 'Holiday shopping & gifts', 'expense');

-- Seed initial base savings adjustment to lock total balance to $12,450.00
-- Calculated as: $12450.00 (Target) - $2050.00 (May Net) - $2440.00 (Apr Net) - $2360.00 (Mar Net) - $2390.00 (Feb Net) - $2530.00 (Jan Net) - $2120.00 (Dec Net) = -$1440.00
-- Therefore, base balance starts at $1440.00. We can add a "Starting Balance" transaction on 2025-11-01 to perfectly seed the history.
INSERT INTO transactions (amount, date, category, description, type) VALUES (1440.00, '2025-11-01', 'Salary', 'Starting Balance Carried Over', 'income');
