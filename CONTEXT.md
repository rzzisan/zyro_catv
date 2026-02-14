# Zyrotech CATV Billing Management - Project Context

## Overview
A mobile-friendly CATV billing management system with a React + Vite frontend and a Node/Express backend backed by MariaDB via Prisma. The UI is Bengali-first with a left sidebar, topbar, and module pages. Authentication uses phone + password with JWT tokens stored in localStorage.

## Current Status
- Home page provides login form and expandable registration form.
- Topbar includes logout button that clears token and returns to home.
- Dashboard UI matches the provided reference style (stats, progress ring, pills).
- Modules implemented with listing + create for Areas, Managers, Collectors.
- Other modules have placeholder UIs (Billing, Customers, Reports, Deposits, Expenses, Expense Categories, Employees, Tutorials).
- Backend APIs for auth, areas, managers, collectors are live.
- Nginx serves the SPA and proxies API requests.
- Systemd service runs the backend API.
- Sidebar supports collapse on desktop and off-canvas on mobile.

## Tech Stack
- Frontend: React 19, Vite 8, React Router 7
- Backend: Node.js, Express, Prisma
- Database: MariaDB (MySQL provider in Prisma)
- Auth: JWT + bcryptjs

## Repository Layout
- Frontend root: /var/www/catv-ui
- Backend root: /var/www/catv-ui/server

Key frontend files:
- src/App.jsx (routes)
- src/pages/Home.jsx (login/registration UI + API calls)
- src/pages/Dashboard.jsx (dashboard UI)
- src/pages/Areas.jsx (list/create areas via API)
- src/pages/Managers.jsx (list/create managers via API)
- src/pages/Collectors.jsx (list/create collectors via API)
- src/components/AppLayout.jsx (layout wrapper)
- src/components/Sidebar.jsx (module nav)
- src/components/Topbar.jsx (topbar + sidebar toggle)
- src/index.css (global styles, layout, responsive)

Key backend files:
- server/src/app.js (Express app, route mounts)
- server/src/index.js (server start)
- server/src/lib/auth.js (JWT helpers + role guard)
- server/src/lib/prisma.js (Prisma client)
- server/src/routes/auth.js (register/login)
- server/src/routes/areas.js (list/create areas)
- server/src/routes/users.js (list/create managers/collectors)
- server/prisma/schema.prisma (data model)

## Environment and Secrets
- Backend env file: server/.env (NOT tracked in git)
- Example: server/.env.example

Required variables:
- DATABASE_URL="mysql://zyro_catv:ZyRO55%23%24@localhost:3306/zyro_catv"
- PORT=5000
- JWT_SECRET=...

## Backend Service
Systemd service:
- /etc/systemd/system/catv-server.service
- Runs: node /var/www/catv-ui/server/src/index.js

Useful commands:
- sudo systemctl restart catv-server
- sudo systemctl status catv-server --no-pager
- sudo journalctl -u catv-server -n 200 --no-pager

## Nginx
Site config: /etc/nginx/sites-available/catv
- root: /var/www/catv-ui/dist
- SPA route: try_files $uri /index.html
- API proxy: /api -> http://127.0.0.1:5000

## API Routes
Base path in production: /api

Auth:
- POST /api/auth/register-company
  Body: { name, companyName, mobile, password, email?, packageId? }
- POST /api/auth/login
  Body: { mobile, password }

Areas:
- GET /api/areas (ADMIN, MANAGER)
- POST /api/areas (ADMIN, MANAGER)
  Body: { name }

Users:
- GET /api/users/managers (ADMIN)
- POST /api/users/managers (ADMIN)
  Body: { name, mobile, password }

- GET /api/users/collectors (ADMIN, MANAGER)
- POST /api/users/collectors (ADMIN, MANAGER)
  Body: { name, mobile, password }

All protected endpoints require:
- Authorization: Bearer <JWT>

## Frontend API Base
- In production: apiBase = '/api'
- In dev: VITE_API_BASE or http://localhost:5000

## Database Schema Highlights (Prisma)
- Company, User, Area, CustomerType, Customer, Bill, Payment
- UserRole: ADMIN, MANAGER, COLLECTOR
- BillingType: ACTIVE, FREE, CLOSED
- BillStatus: DUE, PARTIAL, PAID, ADVANCE

## Seed Data
Seed script: server/prisma/seed.js
- Admin: 01700000000 / admin123
- Manager: 01800000000 / manager123
- Collector: 01900000000 / collector123

Run seed:
- cd server
- npm run db:seed

## Build and Deploy
Frontend build:
- cd /var/www/catv-ui
- npm run build
- sudo nginx -t && sudo systemctl reload nginx

Backend:
- cd /var/www/catv-ui/server
- npm install
- npx prisma generate
- npx prisma migrate dev --name init

## Known Pitfalls and Fixes
- If API requests return HTML ("Unexpected token <"), ensure API uses /api and Nginx proxies /api.
- If server errors show DATABASE_URL missing, check server/.env for corruption and restart catv-server.
- Do not commit server/.env (in .gitignore).

## Next Suggested Steps
- Wire Customers and Billing modules to real APIs.
- Add manager permissions UI and permission save flow.
- Add role-based frontend routing and protected routes.
- Add area-collector relationship in data model and UI.
