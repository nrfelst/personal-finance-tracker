# Personal Finance Tracker

A self-contained personal finance tracker: a React dashboard backed by a Node.js / Express REST API and a SQLite database. Track income and expenses, set category budgets, and visualize spending — all running from a single process.

> **Note:** The app you run is the **Node.js/TypeScript** stack described below. The Java/Spring Boot files under `src/main/java` are reference source displayed inside the in-app "Spring Boot" tab; they are **not** what runs the application.

## Tech Stack

- **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS, lucide-react icons
- **Backend:** Node.js + Express (TypeScript, run via `tsx`)
- **Database:** SQLite (`sqlite3`), auto-created and seeded on first run
- **Dev/prod server:** A single Express process serves both the API and the Vite-built frontend

## Features

- Dashboard with total balance, income/expense summary, and a spending-breakdown donut chart
- Full transaction history with search, type/category filters
- **Add, edit, and delete** transactions
- **Clear All** to wipe the demo data and start fresh with your own
- Per-category monthly budgets with live "spent vs. limit" progress and over-limit alerts
- Analytics: monthly spending trend and spend-by-category charts

## Prerequisites

- **Node.js 18+** (developed on Node 20/24)
- npm

## Run Locally

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**.

On first launch the database file `finance_tracker.db` is created in the project root and seeded with sample data so the dashboard isn't empty. To start from scratch, click **Clear All** in the History tab (this deletes all transactions but keeps your budget categories), or delete `finance_tracker.db` and restart.

### Custom port

The server reads the `PORT` environment variable (defaults to `3000`):

```bash
PORT=3100 npm run dev
```

## Production Build

```bash
npm run build      # builds the frontend (Vite) and bundles the server (esbuild)
NODE_ENV=production node dist/server.cjs
```

In production the Express server serves the static built frontend from `dist/` and the API from the same origin.

## Other scripts

- `npm run lint` — type-check the project with `tsc --noEmit`
- `npm run clean` — remove build artifacts

## Database Schema

SQLite, initialized from `schema.sql`:

**`transactions`**
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | INTEGER PK AUTOINCREMENT | |
| `amount` | REAL NOT NULL | Positive value |
| `date` | TEXT NOT NULL | `YYYY-MM-DD` |
| `category` | TEXT NOT NULL | |
| `description` | TEXT | Optional |
| `type` | TEXT NOT NULL | `income` or `expense` |

**`categories`**
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | INTEGER PK AUTOINCREMENT | |
| `name` | TEXT NOT NULL UNIQUE | |
| `budget_limit` | REAL NOT NULL | Monthly allowance |

## REST API

All endpoints are available at the root path and under an `/api` prefix (e.g. `/transactions` and `/api/transactions`).

### Transactions

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/transactions` | All transactions, newest first |
| GET | `/transactions/:id` | A single transaction |
| POST | `/transactions` | Create a transaction (auto-creates the category for new expenses) |
| PUT | `/transactions/:id` | Update a transaction |
| DELETE | `/transactions/:id` | Delete a transaction |
| DELETE | `/transactions` | Clear **all** transactions (categories are kept) |

### Analytics

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/transactions/summary` | `{ totalIncome, totalExpenses, netBalance }` |
| GET | `/transactions/by-category` | Expense totals grouped by category |
| GET | `/transactions/monthly` | Expense totals per month (last 6 months) |

### Budgets

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/budget` | Categories with their limit and amount spent in the most recent active month |
| PUT | `/budget/:categoryId` | Update a category's `budget_limit` |

**Validation:** amounts must be positive numbers, dates cannot be in the future, and `type` must be `income` or `expense`.

## Notes & Limitations

This is a single-user app with no authentication — anyone with access to the server sees the same data. See the project discussion for the roadmap toward multi-user accounts, CSV import/export, automated bank import, and tests.
