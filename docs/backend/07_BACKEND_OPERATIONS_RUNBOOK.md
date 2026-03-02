# Backend Operations Runbook

## Purpose
خطوات تشغيل backend بشكل موحد لكل المهندسين.

## Local Start (Docker MySQL Recommended)
```bash
cd backend
npm install
```

إعداد env:
1. أنشئ `backend/.env` من `backend/.env.example`.
2. تأكد من:
   - `PORT=3000`
   - `DATABASE_URL=...`
   - `JWT_SECRET=...`

تشغيل:
```bash
docker compose up -d
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run start:dev
```

## Seed Modes
1. `Core` (إلزامي لكل بيئة):
```bash
cd backend
npm run prisma:seed:core
```
2. `Demo` (اختياري للتجارب فقط):
```bash
cd backend
npm run prisma:seed:demo
```
3. `All` (Core + Demo):
```bash
cd backend
npm run prisma:seed:all
```
4. ملاحظة أمان:
   - `prisma:seed:demo` محجوب تلقائيًا على production إلا عند تعيين
     `ALLOW_PRODUCTION_DEMO_SEED=true`.

## Verification
1. Swagger:
   - `http://localhost:3000/api/docs`
2. Health:
   - `http://localhost:3000/health`

## Useful Commands
```bash
cd backend
npm run lint
npm run lint:check
npm run build
npm run test:e2e
npm run prisma:studio
```

## Full Release Gate
```bash
cd backend
npm run qa:release
```

## Docker Diagnostics
```bash
cd backend
docker compose ps
docker compose logs -f
docker compose down
```

## Common Issues
1. Port conflict on 3000:
   - أوقف أي process على نفس المنفذ.
2. DB auth error:
   - راجع `DATABASE_URL`.
3. migrate fails:
   - راجع ترتيب migrations وحالة DB.

## Release Readiness (Backend Side)
1. lint check pass (`npm run lint:check`).
2. build pass.
3. e2e pass.
4. change report مكتمل للتغييرات الحساسة.
5. approved PR حسب governance.
