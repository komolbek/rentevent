# RentEvent Backend

Event equipment rental platform with web frontend and Next.js backend.

## Project Structure

```
rentevent-backend/
├── rentevent-server/    # Backend (Next.js API + Admin Panel)
├── rentevent-web/       # Frontend Website (Vite + React)
└── README.md
```

## Backend (rentevent-server)

Next.js application serving as API backend and admin panel.

### Setup
```bash
cd rentevent-server
pnpm install
pnpm run dev
```

Runs on `http://localhost:3001`

### Environment Variables
See `rentevent-server/.env.example` for required variables.

## Frontend (rentevent-web)

Modern React website built with Vite, Tailwind CSS, and Framer Motion.

### Setup
```bash
cd rentevent-web
pnpm install
pnpm run dev
```

Runs on `http://localhost:3000`

### Environment Variables
- `VITE_API_URL` - Backend API URL (default: `/api` with proxy in dev)

## Deployment (Railway)

Both services can be deployed from this monorepo:

1. **Backend Service**: Set Root Directory to `rentevent-server`
2. **Frontend Service**: Set Root Directory to `rentevent-web`

Configure `FRONTEND_URL` on backend for CORS.
Configure `VITE_API_URL` on frontend pointing to backend URL.
