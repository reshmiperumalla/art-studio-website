# Art Studio Website

A small full-stack site for an art studio. Customers can buy paintings, book a wall painting and request custom pottery. The studio (admin) adds paintings and confirms or declines bookings and pottery requests.

**Stack:** React (Vite) + plain CSS, Node.js + Express, MongoDB Atlas (Mongoose), bcryptjs and JWT for login.

## Prerequisites

- Node.js 18 or newer, and npm
- Git
- A free MongoDB Atlas cluster (a database user, and Network Access that allows your IP, for example 0.0.0.0/0 for a demo)

## 1. Get the code

```
git clone <your-repo-url>
cd art-studio
```

## 2. Backend setup

```
cd backend
npm install
```

Create `backend/.env` by copying `backend/.env.example`, then fill in:

| Variable | Meaning |
|---|---|
| `PORT` | Port for the API (default 5000) |
| `MONGODB_URI` | Your Atlas connection string, including the database name `artstudio` |
| `JWT_SECRET` | Any long random text, used to sign login tokens |

The seed data is in `backend/seedData` (`seed.json` and the `images` folder). Import it:

```
npm run seed
```

The seed script is safe to run again. It only inserts records that are missing, so it never creates duplicates and never overwrites a painting that has since been sold.

Start the API:

```
npm run dev
```

It runs on http://localhost:5000. Check http://localhost:5000/api/health, which should show `"database":"connected"`.

## 3. Frontend setup

In a second terminal:

```
cd frontend
npm install
npm run dev
```

Open the address Vite prints (usually http://localhost:5173). The frontend expects the API at `http://localhost:5000`. To change that, copy `frontend/.env.example` to `frontend/.env` and edit `VITE_API_URL`.

## Demo accounts

- **Studio (admin):** `studio@artstudio.in` / `Studio@123`. This account comes from `seed.json` and is created by `npm run seed`. There is no public admin sign-up.
- **Customer:** use "Create an account" on the login screen. Every self-registered account is a customer.

## Running the checks

With the backend running and the database seeded, in a new terminal inside `backend`:

```
node tests/race.js    # two customers try to buy the same painting at the same moment
node tests/rules.js   # booking and pottery rules, ownership (404) and role (401/403) checks
```

Each line prints PASS or FAIL (or the expected status code).

## Project layout

```
backend/   Express API (models, routes, middleware, seed script, tests)
frontend/  React app (pages and components in src)
```
