# LeadLedger — a mini Lead Manager

A small full-stack app for capturing and tracking sales leads. Express + SQLite API, React (Vite) frontend, JWT auth so every user only sees their own leads.

**Live demo:** _add your deployed link here_

## Features

**Core**
- Add / edit / delete leads (name, email, phone, company, source dropdown, status: New · Contacted · Qualified · Lost)
- Leads table with colour-coded status badges
- Delete asks for confirmation in a dialog
- Search by name / email / company and filter by status
- Validation on **both** frontend (instant feedback) and backend (source of truth, returns per-field errors)

**Bonus (all done)**
- Signup / login (bcrypt + JWT); leads are scoped per user at the SQL level
- Server-side sorting (click column headers) and pagination
- Dashboard cards with count per status — clicking a card filters the table
- Automated API tests (8 tests, in-memory SQLite)
- Single-service deployment config (`render.yaml`)

## Run locally

Requires **Node 22.13 or newer** (uses Node's built-in `node:sqlite`, so there is nothing native to compile).

```bash
git clone <your-repo-url> && cd lead-manager
npm run install:all

cp server/.env.example server/.env      # then set JWT_SECRET

# two terminals:
npm run dev:server     # API on http://localhost:4000
npm run dev:client     # UI  on http://localhost:5173 (proxies /api to :4000)
```

Run the tests: `npm test`

Production-style (one server serves API + built UI):
```bash
npm run build && NODE_ENV=production JWT_SECRET=something-long npm start
```

## API

All `/api/leads/*` routes need `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/signup` · `/api/auth/login` | Returns `{ token, user }` |
| GET | `/api/auth/me` | Current user |
| GET | `/api/leads?q=&status=&sort=&order=&page=&limit=` | Search / filter / sort / paginate |
| GET | `/api/leads/stats` | Total + count per status |
| GET | `/api/leads/meta` | Allowed statuses and sources |
| POST | `/api/leads` | Create |
| GET · PUT · DELETE | `/api/leads/:id` | Read / update (partial OK) / delete |

Errors are JSON: `{ "error": "message", "details": { "field": "reason" } }` with 400 (validation), 401, 404, 409 (duplicate email).

## Tech choices

- **Node + Express** – small, familiar, easy to read.
- **SQLite (Node's built-in `node:sqlite`)** – zero setup and no native build step for reviewers, real SQL, constraints and indexes. Trivial to swap for Postgres later since all queries live in two route files.
- **React + Vite** – fast dev loop; no UI library, just one hand-written CSS file.
- **JWT** – stateless auth, fits a single-page app.

### Database design
`users (id, name, email UNIQUE, password_hash)` 1—N `leads (id, user_id FK ON DELETE CASCADE, name, email, phone, company, source, status CHECK IN (...), created_at, updated_at)`.
Indexes on `(user_id, status)` and `(user_id, created_at)` serve the dashboard counts, filter and default sort.

## Assumptions
- Every lead belongs to exactly one user; there's no sharing/teams.
- Phone is validated loosely (7–20 digits, `+ - ( )` and spaces) to allow international formats.
- Sources are a fixed list defined on the server and fetched by the UI, so both sides can't drift.
- Duplicate lead emails are allowed (the same company may have several contacts).

## What I'd improve with more time
- Move JWT from `localStorage` to an httpOnly cookie, add rate limiting on login, refresh tokens.
- Notes / activity timeline per lead and CSV import/export.
- Frontend tests (React Testing Library) and an end-to-end test (Playwright).
- Optimistic UI updates and inline status change from the table.
- Postgres + migrations for multi-instance deployment.

## What I cut and why
No roles/teams and no email integrations — they'd add scope without strengthening the core CRUD flow the brief asks for.

## Note
_Write 2–3 lines in your own words here: what you're proud of and what was tricky._
