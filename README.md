# Zyrotech CATV Billing Management

This repository contains a mobile-friendly CATV billing management system with a React UI and a Node/Express API backed by MariaDB.

## Requirements
- Node.js 18+
- MariaDB 10.11+

## Environment Setup
Create the backend environment file:

```bash
cp server/.env.example server/.env
```

Update `server/.env` if you use different credentials:

```env
DATABASE_URL="mysql://zyro_catv:ZyRO55%23%24@localhost:3306/zyro_catv"
PORT=5000
JWT_SECRET="change_this_secret"
```

## Database
From the server folder:

```bash
cd server
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

Seeded demo accounts:
- Admin: `01700000000` / `admin123`
- Manager: `01800000000` / `manager123`
- Collector: `01900000000` / `collector123`

## Run Backend
```bash
cd server
npm run dev
```

## Run Frontend
```bash
npm install
npm run dev
```
