- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements

- [x] Scaffold the Project

- [x] Customize the Project

- [x] Install Required Extensions

- [x] Compile the Project

- [ ] Create and Run Task

- [ ] Launch the Project

- [x] Ensure Documentation is Complete
- Work through each checklist item systematically.
- Keep communication concise and focused.
- Follow development best practices.

## Project Notes
- Stack: React + Vite frontend, Node/Express backend, MariaDB via Prisma.
- API base path: /api in production, localhost:5000 in dev.
- Backend service: catv-server systemd unit runs server/src/index.js.
- Nginx: serves /var/www/catv-ui/dist with SPA fallback; proxies /api to backend.
- Auth: phone + password, JWT stored in localStorage; logout clears token.

## Common Commands
- Frontend build: cd /var/www/catv-ui && npm run build
- Backend restart: sudo systemctl restart catv-server
- Nginx reload: sudo nginx -t && sudo systemctl reload nginx
