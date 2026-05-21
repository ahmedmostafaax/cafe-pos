# Cafe POS Demo

A full-stack restaurant POS and ordering demo built with React, Express, Socket.io, and SQLite.

This public version is brand-neutral and ships without real business data, uploaded payment QR codes, local assistant settings, or production databases. On first run, the backend creates a local SQLite database with demo menu data and a demo admin account.

## Features

- Front desk POS for dine-in and takeaway orders
- Customer table ordering page
- Tablet-assisted ordering flow
- Kitchen and bar production boards
- Admin menu, category, user, table, and payment settings
- Order history, dashboard, daily reports, and commission reports
- Realtime updates through Socket.io
- Local SQLite persistence

## Tech Stack

- Frontend: React, Vite, React Router
- Backend: Node.js, Express, Socket.io
- Database: SQLite via better-sqlite3
- Deployment: Docker-ready single backend serving the built frontend

Recommended runtime: Node.js 18-24. Node 26 is not currently recommended because some native SQLite dependencies may not have compatible prebuilt binaries yet.

## Demo Login

```text
Username: admin
Password: admin123
```

The demo login is intentionally simple. Do not use this authentication model unchanged for a production system.

## Local Development

Install and start the backend:

```bash
cd "backend"
npm install
npm run dev
```

Install and start the frontend in another terminal:

```bash
cd "frontend"
npm install
npm run dev
```

The frontend defaults to `http://localhost:3001` for API and Socket.io traffic. You can override it with:

```bash
VITE_API_BASE=http://localhost:3001 npm run dev
```

## Production Build

Build the frontend:

```bash
cd "frontend"
npm install
npm run build
```

Start the backend and point it at the frontend build:

```bash
cd "backend"
npm install
FRONTEND_DIST="../frontend/dist" npm start
```

## Docker

```bash
docker compose up --build
```

The container stores SQLite data under the mounted `./data` directory and uploads under `./uploads`.

## Data And Privacy

The repository intentionally excludes:

- SQLite databases and WAL/SHM sidecar files
- Uploaded menu images and payment QR codes
- Local `.env` files
- Local assistant/editor settings
- Dependency folders and build output

Before publishing your own fork, run:

```bash
rg -n "your-brand|real-name|phone|email|api[_-]?key|secret|token" .
git status --ignored --short
```

## Notes

This is a demo-grade POS project for portfolio and learning use. Payment confirmation, user authentication, authorization, audit logging, and deployment hardening should be redesigned before real production use.
