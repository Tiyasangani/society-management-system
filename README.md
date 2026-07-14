## 1. Database Setup (PostgreSQL) — what you need to run

You need a running PostgreSQL instance (local install, Docker, or a cloud DB like Supabase/Neon/Railway).

**Step 1 — Create the database:**
```bash
psql -U postgres -c "CREATE DATABASE society_management;"
```

**Step 2 — Configure environment variables:**
```bash
cd backend
cp .env.example .env
```
Edit `.env` and set your real Postgres credentials:

**Step 3 — Install dependencies and run the schema migration:**
```bash
npm install
npm run migrate
```
This executes `src/migrations/001_schema.sql`, which creates every table (`users`, `roles`, `buildings`, `flats`, `complaints`, `complaint_images`, `complaint_status_history`, `service_requests`, `maintenance_bills`, `payments`, `announcements`, `audit_logs`, etc.), all foreign keys, check constraints, and indexes. **This is the one command that "sets up your queries" — you do not need to run any SQL by hand.**

**Step 4 (optional but recommended) — Seed sample data:**
```bash
npm run seed
```
This creates one building, one flat, an admin login, and a resident login so you can test immediately:
- Admin: `admin@society.com` / `Admin@123`
- Resident: `resident@society.com` / `Resident@123`

**Step 5 — Start the backend:**
```bash
npm run dev        # with nodemon (auto-restart)
# or
npm start
```
Server runs at `http://localhost:5000`. Health check: `GET /health`. API docs: `http://localhost:5000/api-docs`.

> **If you ever need to reset the database:** drop it and recreate (`DROP DATABASE society_management;` then repeat Step 1 and Step 3). There are no manual queries to write yourself — the whole schema lives in `001_schema.sql` and every controller uses parameterized queries (`$1, $2…`) against it, so nothing else needs to be typed into `psql`.

---

## 2. Frontend Setup

```bash
cd frontend
cp .env.example .env      # points VITE_API_URL at your backend
npm install
npm run dev
```
Runs at `http://localhost:5173`. Log in with the seeded admin/resident accounts above, or register a new resident (you'll need at least one flat in the DB — the seed script creates one; admins can add more via the `/api/flats/units` endpoint).

---

## 3. Environment Variables Reference

**Backend (`backend/.env`):**
| Variable | Description |
|---|---|
| `PORT` | API port (default 5000) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | Secret used to sign JWTs — must be long and random |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `MAX_FILE_SIZE_MB` | Max complaint image size |
| `CLIENT_URL` | Frontend origin for CORS |

**Frontend (`frontend/.env`):**
| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API, e.g. `http://localhost:5000/api` |

---

## 4. Database Schema (summary)

Normalized to 3NF. Key tables:
- `roles` / `users` — single `users` table differentiated by `role_id` (admin, committee, resident), linked to `flats`
- `buildings` / `flats` — society structure
- `committee_members` — extends `users` with designation and notice-publishing permission
- `complaints` / `complaint_images` / `complaint_status_history` — one-to-many image uploads and a full audit trail of status changes
- `complaint_categories` — lookup table
- `service_requests` — resident-submitted, admin/committee-approved
- `maintenance_bills` / `payments` — one bill can have multiple partial payments; bill status auto-updates (`unpaid → partial → paid`)
- `announcements` — with urgency flag and optional expiry
- `audit_logs` — every create/update/login action is logged with actor, entity, and IP
- `refresh_tokens` — reserved for refresh-token flow if you extend JWT auth

Full DDL: `backend/src/migrations/001_schema.sql`

---

## 5. API Overview

Base URL: `http://localhost:5000/api` · Full interactive docs: `http://localhost:5000/api-docs`

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Residents | `GET/POST /residents`, `PUT/DELETE /residents/:id` |
| Committee | `GET/POST /committee` |
| Complaints | `GET/POST /complaints` (multipart image upload), `PATCH /complaints/:id/status`, `GET /complaints/:id/history` |
| Service Requests | `GET/POST /service-requests`, `PATCH /service-requests/:id/status` |
| Billing | `GET/POST /bills`, `POST /bills/bulk` |
| Payments | `GET/POST /payments` |
| Announcements | `GET/POST /announcements`, `DELETE /announcements/:id` |
| Dashboard | `GET /dashboard/summary`, `GET /dashboard/audit-logs` |
| Flats | `GET /flats`, `POST /flats/buildings`, `POST /flats/units` |

All endpoints except `register`, `login`, and `GET /flats` require a `Authorization: Bearer <token>` header. RBAC is enforced per-route via middleware (e.g. only `admin` can create bills; only `resident` can raise complaints).

---

## 6. Security Practices Implemented

- Passwords hashed with bcrypt (never stored/returned in plain text)
- JWT-based stateless authentication
- Role-Based Access Control middleware on every protected route
- All SQL uses parameterized queries (`$1, $2…`) — no string concatenation, no SQL injection surface
- `helmet` for secure HTTP headers, `cors` restricted to configured client origin
- Multer file-type whitelist (JPEG/PNG/WEBP only) and file-size limit for complaint images
- Full audit logging of create/update/login actions with actor and IP address

---

## 7. Testing

The backend ships with a Jest + Supertest suite covering the health check, request validation, and the JWT auth middleware (`backend/tests/auth.test.js`). It runs without a live database, so it's safe to use in CI:

```bash
cd backend
npm install
npm test
```

For full end-to-end coverage, point the `DB_*` env vars at a disposable test database and extend the suite with DB-backed cases (register → login → hit a protected route, create a bill → pay it → assert status, etc).

---

## 8. API Collection

A ready-to-import Postman collection covering every endpoint (auth, residents, committee, flats, complaints, service requests, billing, payments, announcements, dashboard) lives at `backend/postman_collection.json`. Import it into Postman, set the `baseUrl` variable if it differs from `http://localhost:5000/api`, run **Login**, and the JWT is saved automatically to the `token` variable for every subsequent request. The same API is also documented interactively via Swagger at `/api-docs` once the server is running.

---

## 9. Pushing to GitHub

A `.gitignore` is already included at the project root (excludes `node_modules/`, `.env`, `dist/`, and uploaded complaint images so secrets and build artifacts never get pushed).

```bash
cd society-management-system
git init
git add .
git commit -m "Initial commit: Society Management System (backend + frontend)"
git branch -M main
git remote add origin https://github.com/<your-username>/society-management-system.git
git push -u origin main
```

Push regularly with meaningful commit messages as you extend modules (e.g. `feat: add complaint image upload`, `fix: bill status not updating on partial payment`).

---

## 10. Known Limitations

- **Online payments require Razorpay test keys.** `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `backend/.env` and `VITE_RAZORPAY_KEY_ID` in `frontend/.env` ship with placeholder values. Without real test keys (free, from https://dashboard.razorpay.com/ → Settings → API Keys → Generate Test Key), the resident-side "Pay ₹X" button will fail with a server error. **As a working alternative that needs no external account, admins can click "Record payment" on the Billing page to log a payment manually (cash/cheque/UPI) — this fully updates bill status and is backed by the same `POST /api/payments` endpoint used by the automated tests and Postman collection.**
- **No refresh-token rotation flow.** The `refresh_tokens` table exists in the schema for this purpose but isn't wired up yet; JWTs are currently long-lived (`JWT_EXPIRES_IN`, default 7 days) with no revoke-on-logout mechanism.
- **Seed script is not idempotent for buildings/flats.** Running `npm run seed` more than once will insert duplicate buildings (user seeding is safe via `ON CONFLICT DO NOTHING`, but the building/flat insert isn't guarded). Reset the database if you need a clean slate.
- **Test suite covers validation, not DB-backed flows.** `npm test` runs without a live database and checks routing/validation/auth-middleware behavior only; it doesn't yet cover full create→read→update flows against real data (see Section 7 for how to extend it).