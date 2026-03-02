# Frontend Operations Runbook

## Purpose
خطوات تشغيل frontend بشكل موحد لكل المهندسين.

## Local Start
```bash
cd frontend
npm install
```

إعداد env:
1. أنشئ `frontend/.env.local` من `frontend/.env.example`.
2. تأكد من:
   - `BACKEND_API_URL=http://localhost:3000`
   - `NEXT_PUBLIC_API_PROXY_PREFIX=/backend`

تشغيل:
```bash
npm run dev
```

Open:
1. `http://localhost:3001`

## Production-Style Checks
```bash
cd frontend
npm run lint
npm run typecheck
npm run build
npm run start
```

## E2E Checks
```bash
cd frontend
npm run e2e
npm run e2e:release
```

## Full Release Gate
```bash
cd frontend
npm run qa:release
```

## Dependency with Backend
frontend يحتاج backend شغال على:
1. `http://localhost:3000`
2. Swagger for verification: `http://localhost:3000/api/docs`

## Common Issues
1. proxy/API errors:
   - تحقق من `.env.local`.
   - تحقق backend up.
2. build errors:
   - نفذ `npm run typecheck` لمعرفة المصدر.
3. E2E failures:
   - راجع mock helpers.
   - تأكد data-testid لم تتغير.

## Release Readiness (Frontend Side)
1. lint pass.
2. typecheck pass.
3. build pass.
4. release E2E pack pass (`npm run e2e:release`).
5. PR approved حسب governance.
