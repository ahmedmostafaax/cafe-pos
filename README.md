# GODZ Café POS

Full-stack restaurant POS and ordering system (GODZ theme) — React, Express, Socket.io, MongoDB.

## Features

- Front desk POS for dine-in and takeaway
- Customer table ordering (QR) with GODZ theme
- Online ordering landing page
- Kitchen and bar production boards
- Admin: menu, categories, users, tables, offers
- Service calls with sound alerts
- Payment gateway modal (Kashier / InstaPay / Wallet) — ready for real tokens
- Realtime updates via Socket.io
- Optional Redis (graceful if unavailable)

## Tech Stack

- Frontend: React, Vite, React Router, Tailwind CSS v4
- Backend: Node.js, Express, Socket.io
- Database: MongoDB (Mongoose)
- Cache: Redis (optional)
- Deployment: Docker-ready

Recommended runtime: **Node.js 18–22**.

## Demo Login

```
Username: admin
Password: admin123
```

## Quick Start (local)

### Prerequisites

- Node.js 18+
- MongoDB running locally (or MongoDB Atlas URI)
- Redis optional

```bash
# Backend
cd backend
cp ../.env.example .env   # edit MONGO_URI / JWT_SECRET
npm install
npm run dev               # http://localhost:3001

# Frontend (another terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Seed demo data (from backend folder, with Mongo up):

```bash
node seed.js
```

## Environment

See `.env.example`:

| Variable       | Description                          |
|----------------|--------------------------------------|
| `PORT`         | Backend port (default 3001)          |
| `MONGO_URI`    | MongoDB connection string            |
| `REDIS_URL`    | Optional Redis URL                   |
| `JWT_SECRET`   | Auth secret                          |
| `FRONTEND_URL` | CORS origin (e.g. http://localhost:5173) |

## Docker

```bash
docker compose up --build
```

Includes MongoDB + Redis services. Set `JWT_SECRET` / `FRONTEND_URL` via env if needed.

## Payment (Kashier)

The UI payment gateway is integrated. After deploy on AWS, plug in real Kashier tokens/keys in the backend payment handlers — the modal already posts to `/orders/pay-gateway` and public track endpoints.

## Theme

Unified **GODZ** warm café palette across landing, table customer, staff, cashier, and payment gateway.

