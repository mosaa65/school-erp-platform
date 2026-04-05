# School ERP Platform

## Local Run

1. Install dependencies in both apps:

```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Copy env files and adjust values for your environment:

```bash
backend/.env.example -> backend/.env
frontend/.env.example -> frontend/.env.local
```

3. In `backend`, generate Prisma client, apply migrations, and seed data:

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed:core
```

4. Start the backend:

```bash
npm run start:dev
```

The backend listens on `PORT` and defaults to `http://localhost:3000`.

5. Start the frontend:

```bash
npm run dev
```

The frontend listens on `PORT` if provided, otherwise defaults locally to `http://localhost:3001`.

## Deployment Notes

- Backend production start honors `PORT`.
- Frontend `dev` and `start` now honor `PORT` as well, with a local fallback to `3001`.
- Set `BACKEND_API_URL` in the frontend environment to your deployed backend base URL.
- Optional MySQL triggers for journal-period DB hardening live in `backend/prisma/optional/finance-journal-period-triggers.sql` and are no longer required for the main migration path.
