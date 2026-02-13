# Changelog

## 2026-02-13
- Phase 1: Backend architecture + database schema set up.
- Added a Node/Express API shell with a health endpoint for a stable service base.
- Designed a PostgreSQL schema (Prisma) for company registration, users/roles, areas, customer types, customers, bills, and payments.
- Added an environment example to document required DB and port settings.
- Files added:
  - server/package.json
  - server/src/app.js
  - server/src/index.js
  - server/prisma/schema.prisma
  - server/.env.example
  - changelog.md

- Update: Switched database to MongoDB.
- Updated Prisma schema to use MongoDB ObjectId fields and relations.
- Added Prisma client dependency.
- Updated the example DATABASE_URL for MongoDB.

- Update: Switched database to MySQL/MariaDB because the server CPU lacks AVX (MongoDB 7 could not run).
- Updated Prisma schema back to MySQL provider.
- Updated example DATABASE_URL for MySQL with the provided credentials.

- Phase 2: Database migration setup.
- Added server .env with the provided MySQL credentials.
- Installed backend dependencies and generated Prisma client.
- Applied the initial Prisma migration and created the database schema.
- Granted CREATE/DROP privileges to allow Prisma shadow DB during migrations.

- Phase 2: Auth API scaffold.
- Added JWT-based auth utilities and Prisma client helper.
- Implemented company registration and login endpoints with BD mobile validation.
- Added JWT secret to env files and installed auth dependencies.

- Phase 3: Core billing modules UI.
- Added Customers and Billing pages with filters, search, and mobile-friendly card views.
- Updated routes and sidebar navigation for new modules.
- Added responsive UI styles for filters, status pills, and action stacks.
- Improved the Area page to include a mobile card layout.

- Phase 4: Demo seed data and documentation.
- Added Prisma seed script with demo company, users, permissions, areas, customers, bills, and payments.
- Added npm scripts for seeding.
- Replaced the default README with project setup instructions and demo login info.

- Update: Moved login and registration UI to the home page.
- Removed the standalone login route UI and demo navigation links from home.
- Added a new auth layout with tabs and registration fields.

- Update: Connected home login and registration forms to the backend auth API.
- Added basic success/error feedback and token storage in localStorage.

- Update: Simplified home page to show only login and a registration link.
- Removed demo routes from the app router.

- Ops: Rebuilt the frontend and reloaded Nginx for catv.zyrotechbd.com to serve the latest UI.

- Ops: Added Nginx reverse proxy for /auth to the backend API.
- Ops: Created and enabled a systemd service for the Node API.
- Ops: Rebuilt the frontend to use same-origin auth API in production.

- Update: Added a basic admin dashboard page and route.
- Update: Redirect to /dashboard after successful login or registration.

- Update: Rebuilt dashboard and module pages to match the provided layout style.
- Added shared layout components (sidebar, topbar) and module list routes.
- Added dashboard progress, stat, and pill card styles.

- Update: Added collapsible sidebar with mobile off-canvas behavior and overlay.
- Update: Added topbar menu toggle button for sidebar control.

- Feature: Added backend APIs for areas, managers, and collectors with role-based access.
- Feature: Wired Areas, Managers, and Collectors pages to list and create records.
- UI: Added status banners for module feedback.

- Fix: Removed accidental command text from App.jsx.
- Ops: Added Nginx proxy for /areas and /users API routes.

- Fix: Moved API routes under /api to avoid SPA route conflicts.
- Ops: Updated Nginx proxy to /api and frontend API base to /api.

- Fix: Cleaned corrupted server .env so DATABASE_URL loads correctly.

- Fix: Removed invalid createdById field when creating managers/collectors.
