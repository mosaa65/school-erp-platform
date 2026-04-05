# School ERP - Engineering Execution Governance

## 1) الهدف
هذا الملف هو مرجع التشغيل الرسمي للفريق الهندسي لضمان:
1. توحيد البرمجة.
2. توحيد التصميم.
3. توحيد الأداء.
4. توحيد طريقة العمل على GitHub وDocker.
5. حماية الملكية الفكرية قدر الإمكان.

هذا المرجع ملزم لكل مهندس يعمل على المشروع.

---

## 2) قرار القيادة والاعتماد
1. الاعتماد النهائي لأي تغيير إنتاجي يكون من:
   - المهندس التنفيذي المسؤول: **موسى العواضي**
   - المشرف التقني: **عماد الجماعي**
2. لا يتم دمج أي PR إلى `main` بدون موافقة الاثنين أو من يفوضانه كتابيا.

---

## 3) قواعد التوحيد من البداية

### 3.1 توحيد البرمجة (Code Consistency)
1. Backend:
   - NestJS modular architecture.
   - Prisma + MySQL.
   - DTO validation إلزامي.
   - RBAC checks إلزامية.
2. Frontend:
   - Next.js App Router.
   - React Query.
   - shadcn + Tailwind.
   - Permission-based rendering.
3. Naming:
   - camelCase للمتغيرات والدوال.
   - PascalCase للـ classes/components/types.
   - kebab-case للملفات.
4. لا merge بدون:
   - `lint` pass.
   - `typecheck` pass.
   - tests المطلوبة pass.

### 3.2 توحيد التصميم (UI Consistency)
1. استخدام Design tokens موحدة (colors/spacing/typography).
2. استخدام components القياسية قبل إنشاء component جديد.
3. أي شاشة جديدة يجب:
   - تدعم responsive.
   - تدعم dark/light إن كان الموديول داخل shell الحالي.
   - تتبع نمط cards/forms/filters الحالي.

### 3.3 توحيد الأداء (Performance Consistency)
1. Backend:
   - منع N+1 queries.
   - pagination لكل list endpoint.
   - indexes للحقول المستخدمة بالفلاتر.
2. Frontend:
   - تجنب client state غير الضروري.
   - cache/query keys واضحة في React Query.
   - loading/error/empty states إلزامية.
3. E2E:
   - tests على المسارات الحرجة قبل أي release.

---

## 4) GitHub Setup (مرة واحدة)

## 4.1 الحساب والتنظيم
1. إنشاء GitHub Organization خاصة بالشركة.
2. إنشاء مستودعين خاصين:
   - `school-erp-backend` (Private)
   - `school-erp-frontend` (Private)
3. منع استخدام حسابات شخصية مجهولة أو بريد غير رسمي.

## 4.2 فرق الصلاحيات المقترحة
1. `exec-owners`:
   - موسى + عماد فقط.
   - صلاحية Admin.
2. `engineers`:
   - 4 مهندسين.
   - صلاحية Write.
3. `reviewers`:
   - يمكن أن تتقاطع مع engineers.
   - صلاحية Review إلزامية.

## 4.3 Branch Protection Rules
طبّق على `main`:
1. Require pull request.
2. Require at least 2 approvals.
3. Require status checks:
   - Backend: lint, build, test:e2e (حسب المرحلة)
   - Frontend: lint, typecheck, build, e2e
4. Dismiss stale reviews.
5. Restrict who can push.
6. Require conversation resolution.

طبّق على `develop`:
1. Require PR.
2. Require at least 1 approval.
3. Require lint + typecheck.

---

## 5) Strategy of Branches
نوصي بالنمط التالي:
1. `main`: إنتاج فقط.
2. `develop`: تجميعي قبل الإنتاج.
3. `feature/*`: تطوير ميزات.
4. `fix/*`: إصلاحات غير طارئة.
5. `hotfix/*`: إصلاح طارئ مباشر.
6. `docs/*`: توثيق.

صيغة اسم الفرع:
1. `feature/SYS03-hr-attendance-filters-eng03`
2. `fix/SYS02-subjects-pagination-eng02`
3. `docs/team-playbook-eng01`

أوامر إنشاء Branch:
```bash
git checkout develop
git pull origin develop
git switch -c feature/SYS03-hr-attendance-filters-eng03
git push -u origin feature/SYS03-hr-attendance-filters-eng03
```

---

## 6) Workflow يومي للمهندس
```bash
git checkout develop
git pull origin develop
git switch -c feature/<branch-name>

# تنفيذ الشغل

git add .
git commit -m "feat(hr): add employee attendance filters"
git push -u origin feature/<branch-name>
```

بعد رفع الفرع:
1. فتح Pull Request إلى `develop`.
2. تعبئة قالب التقرير الإلزامي (انظر ملف القالب).
3. انتظار المراجعة والتعديلات.

---

## 7) Docker Strategy
الافتراضي للفريق: استخدام Docker لقاعدة البيانات لتوحيد البيئة.

من داخل `backend`:
```bash
docker compose up -d
npm install
npm run prisma:migrate:deploy
npm run prisma:seed
npm run start:dev
```

أوامر تشخيص:
```bash
docker compose ps
docker compose logs -f
docker compose down
```

إذا تم استخدام MySQL محلي (مثل XAMPP):
1. يكون استثناء فقط بموافقة.
2. يجب مطابقة نفس `DATABASE_URL`.

---

## 8) Onboarding Guide للمهندسين (من الصفر)

## 8.1 تجهيز الحساب
1. إنشاء حساب GitHub رسمي.
2. تفعيل 2FA.
3. رفع SSH key.
4. الانضمام للـ Organization.

أوامر SSH (مرة واحدة):
```bash
ssh-keygen -t ed25519 -C "your-work-email@company.com"
# اعرض المفتاح العام
cat ~/.ssh/id_ed25519.pub
```

أضف المفتاح من GitHub:
1. `Settings`
2. `SSH and GPG keys`
3. `New SSH key`

## 8.2 تجهيز الجهاز
1. تثبيت:
   - Node LTS
   - npm
   - Docker Desktop
   - Git
2. التحقق:
```bash
node -v
npm -v
docker -v
git --version
```

## 8.3 تشغيل المشروع
Clone:
```bash
git clone git@github.com:<org>/school-erp-backend.git
git clone git@github.com:<org>/school-erp-frontend.git
```

Backend:
```bash
cd backend
npm install
# Linux/macOS
cp .env.example .env
# PowerShell
# Copy-Item .env.example .env
docker compose up -d
npm run prisma:migrate:deploy
npm run prisma:seed
npm run start:dev
```

Frontend:
```bash
cd frontend
npm install
# Linux/macOS
cp .env.example .env.local
# PowerShell
# Copy-Item .env.example .env.local
npm run dev
```

اختبارات:
```bash
cd frontend
npm run lint
npm run typecheck
npm run e2e
```

---

## 9) كيف نمنع نسخ/سرقة المشروع (واقعيا)
لا يوجد منع 100% إذا أعطيت شخص صلاحية قراءة كاملة.
الحل الصحيح = **مزيج قانوني + تنظيمي + تقني**.

## 9.1 ضوابط قانونية إلزامية
1. NDA إلزامي.
2. IP Assignment Agreement إلزامي.
3. بند جزائي واضح عند التسريب أو إعادة البيع.

## 9.2 ضوابط تنظيمية
1. Least Privilege:
   - كل مهندس يأخذ أقل صلاحية لازمة.
2. عدم إعطاء جميع المهندسين وصول Admin.
3. فصل المسؤوليات حسب أنظمة/Modules.

## 9.3 ضوابط تقنية
1. المستودعات تكون Private داخل Organization.
2. تفعيل branch protection بالكامل.
3. منع رفع الأسرار في الكود.
4. إدارة secrets عبر env managers (ليس داخل git).
5. CI/CD deploy من حساب رسمي فقط.
6. تعطيل sharing غير الضروري للبيانات الإنتاجية.

## 9.4 نموذج العمل الأكثر أمانا (Recommended)
1. `Core private repos` لا يصلها إلا القيادة.
2. مهندسون يعملون على repos فرعية أو branches مخصصة.
3. الدمج النهائي يتم فقط من القيادة.

---

## 10) شروط العمل الملزمة (Team Conditions)
1. ممنوع العمل المباشر على `main`.
2. ممنوع merge ذاتي بدون review.
3. أي تغيير DB يحتاج تقرير تغيير رسمي.
4. أي تعديل cross-system يحتاج موافقة موسى + عماد.
5. أي endpoint جديد يجب Swagger + validation + RBAC.
6. أي صفحة جديدة يجب permission guard + states (loading/error/empty).
7. أي PR بدون tests/checks يرفض مباشرة.

---

## 11) قالب التقرير الإلزامي للتعديلات
استخدم القالب الجاهز:

`docs/templates/ENGINEERING_CHANGE_REPORT_TEMPLATE.md`

هذا القالب إلزامي خصوصا عند:
1. تعديل جداول.
2. migrations جديدة.
3. تغييرات APIs.
4. تغييرات تؤثر نظام فرعي آخر.

---

## 12) آلية المراجعة والاعتماد النهائي
حالات PR:
1. `Draft` -> تحت التطوير.
2. `Ready for Review` -> جاهز للمراجعة الفنية.
3. `Approved` -> مراجع من مهندس + مشرف.
4. `Final Approved` -> اعتماد موسى + عماد.
5. `Merged` -> الدمج.

لا يتم الانتقال للإنتاج إلا بعد الحالة 4.

---

## 13) خطة تعليم الفريق (How to train engineers)
1. Session 1 (90 min): architecture + repos + run flow.
2. Session 2 (90 min): branching + PR + review + report template.
3. Session 3 (120 min): hands-on task صغير لكل مهندس + live review.
4. أول أسبوع:
   - Daily 15 min standup.
   - End-of-day report لكل مهندس.
5. قياس الجاهزية:
   - يستطيع تشغيل backend/frontend.
   - يستطيع فتح PR نظيف.
   - يستطيع تعبئة Change Report بدون أخطاء.
