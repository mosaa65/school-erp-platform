# School ERP Platform (Local Setup Summary)

## ما تم في هذه الجولة
- أوقفت جميع عمليات `node` التي كانت تتسبب في قفل ملفات السجل للواجهة (`frontend-stdout.log` و `frontend-stderr.log`).
- أضفت قواعد تجاهل في `.gitignore` لحفظ سجلات الواجهة من التتبع المستقبلي.
- أنشأت هذا الملف لشرح الخطوات الأساسية لتشغيل المشروع محلياً.

## تشغيل المشروع محلياً
1. تأكد من وجود Node.js و npm على جهازك.
2. انتقل إلى مجلدي `backend` و `frontend` على التوالي، وشغل `npm install`.
3. جهز قاعدة بيانات (مثل MySQL أو PostgreSQL) وركّب المتغيرات المناسبة في `backend/.env.example`.
4. من `backend`، نفّذ `npx prisma migrate deploy` ثم `npm run prisma:seed` لإنشاء الجداول والبيانات التجريبية.
5. شغل الخادم عبر `npm run start:dev` من داخل مجلد `backend`.
6. من مجلد `frontend`، شغل `npm run dev` للوصول إلى واجهة المستخدم على `http://localhost:3000`.

## ملاحظات
- إذا ظهرت ملفات سجلات جديدة، سيتم تجاهلها تلقائياً لأننا أضفناها إلى `.gitignore`.
- يجب تحديث هذا الملف إذا تغير مسار أي سجل أو أضيفت خطوات تشغيل إضافية.
