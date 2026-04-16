# 📖 دليل أوامر مشروع School ERP Platform

> هذا الدليل يشرح بالتفصيل كل الأوامر والخطوات التي تحتاجها للعمل على المشروع، مكتوب بطريقة مبسطة للمبتدئين.

---

## 📋 فهرس المحتويات

1. [نظرة عامة على المشروع](#-نظرة-عامة-على-المشروع)
2. [المتطلبات الأساسية](#-المتطلبات-الأساسية-prerequisites)
3. [الإعداد الأولي للمشروع](#-الإعداد-الأولي-للمشروع-أول-مرة-فقط)
4. [تشغيل قاعدة البيانات](#-تشغيل-قاعدة-البيانات)
5. [أوامر Prisma (إدارة قاعدة البيانات)](#-أوامر-prisma-إدارة-قاعدة-البيانات)
6. [تشغيل السيرفرات](#-تشغيل-السيرفرات)
7. [التشغيل التلقائي الكامل](#-التشغيل-التلقائي-الكامل-طريقة-سريعة)
8. [أوامر Git و GitHub](#-أوامر-git-و-github)
9. [أوامر الاختبار](#-أوامر-الاختبار-testing)
10. [أوامر الجودة والتنسيق](#-أوامر-الجودة-والتنسيق)
11. [أوامر البناء والنشر](#-أوامر-البناء-والنشر-production)
12. [روابط ومنافذ المشروع](#-روابط-ومنافذ-المشروع)
13. [حل المشاكل الشائعة](#-حل-المشاكل-الشائعة-troubleshooting)
14. [ملخص سريع](#-ملخص-سريع-cheat-sheet)

---

## 🏫 نظرة عامة على المشروع

هذا المشروع هو **نظام إدارة مدرسة (School ERP)** يتكون من جزئين رئيسيين:

| الجزء | التقنية | المنفذ | المسار |
|--------|---------|--------|--------|
| **Backend** (الخلفية) | NestJS + Prisma + MySQL | `3000` | `backend/` |
| **Frontend** (الواجهة) | Next.js 14 + React 18 + TailwindCSS | `3001` | `frontend/` |

**قاعدة البيانات:** MySQL 8.4 (يمكن تشغيلها عبر Docker أو استخدام قاعدة بيانات خارجية)

### البنية العامة للمشروع
```
school-erp-platform/
├── backend/                 # سيرفر الـ API (NestJS)
│   ├── src/                 # الكود المصدري
│   │   ├── modules/         # الوحدات (82 وحدة: طلاب، موظفين، مالية...)
│   │   ├── auth/            # نظام المصادقة
│   │   └── prisma/          # خدمة Prisma
│   ├── prisma/              # ملفات قاعدة البيانات
│   │   ├── schema.prisma    # بنية قاعدة البيانات
│   │   ├── migrations/      # ملفات الترحيل
│   │   └── seeds/           # بيانات أولية
│   ├── .env                 # متغيرات البيئة
│   ├── docker-compose.yml   # إعدادات Docker لقاعدة البيانات
│   └── package.json         # الحزم والأوامر
├── frontend/                # واجهة المستخدم (Next.js)
│   ├── src/
│   │   ├── app/             # صفحات التطبيق
│   │   ├── components/      # المكونات المشتركة
│   │   ├── features/        # الميزات
│   │   └── hooks/           # React Hooks
│   ├── .env.local           # متغيرات البيئة
│   └── package.json         # الحزم والأوامر
└── run-full-project.bat     # سكريبت التشغيل الكامل
```

---

## ⚙️ المتطلبات الأساسية (Prerequisites)

قبل البدء، تأكد من تثبيت البرامج التالية على جهازك:

| البرنامج | الغرض | رابط التحميل |
|----------|-------|-------------|
| **Node.js** (v18+) | تشغيل JavaScript على السيرفر | [nodejs.org](https://nodejs.org) |
| **npm** | إدارة الحزم (يأتي مع Node.js) | يأتي تلقائياً مع Node.js |
| **Git** | التحكم بالنسخ ورفع الكود | [git-scm.com](https://git-scm.com) |
| **Docker Desktop** *(اختياري)* | تشغيل قاعدة البيانات محلياً | [docker.com](https://docker.com) |
| **VS Code** *(موصى به)* | محرر الكود | [code.visualstudio.com](https://code.visualstudio.com) |

### التحقق من التثبيت
```powershell
# تحقق من Node.js
node --version
# يجب أن يظهر: v18.x.x أو أعلى

# تحقق من npm
npm --version

# تحقق من Git
git --version

# تحقق من Docker (اختياري)
docker --version
```

---

## 🚀 الإعداد الأولي للمشروع (أول مرة فقط)

### الخطوة 1: استنساخ المشروع من GitHub
```powershell
# انسخ المشروع إلى جهازك
git clone <رابط-المستودع> school-erp-platform

# ادخل مجلد المشروع
cd school-erp-platform
```

### الخطوة 2: إعداد ملفات البيئة (Environment Variables)

ملفات البيئة تحتوي على الإعدادات الخاصة بمشروعك مثل بيانات قاعدة البيانات والمفاتيح السرية.

**للـ Backend:**
```powershell
# انسخ ملف المثال وعدّله
cd backend
copy .env.example .env
```

ثم افتح ملف `backend/.env` وعدّل القيم حسب بيئتك:
```env
# أهم المتغيرات التي تحتاج تعديلها:
NODE_ENV=development                    # بيئة التطوير
DATABASE_URL="mysql://user:pass@host:3306/dbname"  # رابط قاعدة البيانات
PORT=3000                               # منفذ السيرفر
CORS_ORIGIN=http://localhost:3001       # رابط الواجهة الأمامية
```

**للـ Frontend:**
```powershell
cd ..\frontend
copy .env.example .env.local
```

ملف `frontend/.env.local` يحتوي عادةً:
```env
BACKEND_API_URL=http://localhost:3000        # رابط سيرفر الـ API
NEXT_PUBLIC_API_PROXY_PREFIX=/backend       # بادئة الـ Proxy
```

### الخطوة 3: تثبيت الحزم (Dependencies)

```powershell
# تثبيت حزم الـ Backend
cd backend
npm install

# تثبيت حزم الـ Frontend
cd ..\frontend
npm install
```

> [!NOTE]
> عند تشغيل `npm install` في مجلد الـ Backend، سيتم تلقائياً تشغيل `prisma generate` بفضل سكريبت `postinstall`.

### الخطوة 4: إعداد قاعدة البيانات

```powershell
cd backend

# 1. توليد Prisma Client (الكلاينت الذي يتواصل مع قاعدة البيانات)
npm run prisma:generate

# 2. تطبيق الترحيلات (إنشاء الجداول في قاعدة البيانات)
npm run prisma:migrate:deploy

# 3. إدخال البيانات الأساسية (حساب الأدمن والإعدادات)
npm run prisma:seed:core

# 4. (اختياري) إدخال بيانات تجريبية للتطوير
npm run prisma:seed:demo
```

---

## 🗄️ تشغيل قاعدة البيانات

### الخيار 1: استخدام Docker (موصى به للمبتدئين)

المشروع يأتي مع ملف `docker-compose.yml` جاهز في مجلد الـ backend:

```powershell
cd backend

# تشغيل قاعدة البيانات
docker compose up -d

# التحقق من أن قاعدة البيانات تعمل
docker compose ps

# إيقاف قاعدة البيانات
docker compose down

# إيقاف قاعدة البيانات مع حذف البيانات (تحذير: يمسح كل شيء!)
docker compose down -v
```

**إعدادات Docker الافتراضية:**
| الإعداد | القيمة |
|---------|--------|
| اسم الحاوية | `school-erp-mysql` |
| قاعدة البيانات | `school_erp_clean` |
| المستخدم | `school_user` |
| كلمة المرور | `school_password` |
| كلمة مرور Root | `root_password` |
| المنفذ | `3306` |

عند استخدام Docker، تأكد من تحديث `DATABASE_URL` في ملف `.env`:
```env
DATABASE_URL="mysql://school_user:school_password@localhost:3306/school_erp_clean"
```

### الخيار 2: استخدام قاعدة بيانات خارجية

المشروع حالياً مُعد مسبقاً للاتصال بقاعدة بيانات خارجية على Hostinger. إذا كنت تستخدم قاعدة بيانات خارجية، فقط تأكد أن `DATABASE_URL` في ملف `.env` يشير إلى القاعدة الصحيحة.

---

## 🔧 أوامر Prisma (إدارة قاعدة البيانات)

Prisma هو الـ ORM المستخدم للتعامل مع قاعدة البيانات. كل الأوامر تُنفذ من مجلد `backend/`.

### أوامر أساسية

```powershell
cd backend

# ✅ توليد Prisma Client
# يقرأ ملف schema.prisma وينشئ كلاينت TypeScript للتعامل مع قاعدة البيانات
npm run prisma:generate

# ✅ تطبيق الترحيلات (Migrations) على قاعدة البيانات
# ينفذ ملفات SQL التي تنشئ/تعدّل الجداول
npm run prisma:migrate:deploy

# ✅ إنشاء ترحيل جديد (عند تعديل schema.prisma)
# يقارن التغييرات في schema.prisma مع قاعدة البيانات وينشئ ملف ترحيل جديد
npm run prisma:migrate:dev

# ✅ فتح Prisma Studio (واجهة رسومية لاستعراض البيانات)
# يفتح متصفح ويب لتصفح وتعديل بيانات قاعدة البيانات
npm run prisma:studio
```

### أوامر البذر (Seeding) - إدخال بيانات أولية

```powershell
# 🌱 إدخال البيانات الأساسية (مطلوب - أول مرة)
# ينشئ: حساب الأدمن، الأدوار، الصلاحيات، الإعدادات الأساسية
npm run prisma:seed:core

# 🌱 إدخال بيانات تجريبية (اختياري - للتطوير فقط)
# ينشئ: طلاب تجريبيين، موظفين، درجات، حضور، إلخ
npm run prisma:seed:demo

# 🌱 إدخال كل البيانات (أساسية + تجريبية)
npm run prisma:seed:all

# 🌱 إدخال بيانات تجريبية لسجل التدقيق
npm run prisma:seed:audit-demo
```

> [!WARNING]
> **لا تشغّل** `prisma:seed:demo` على بيئة الإنتاج (Production)! سيتم رفضه تلقائياً إلا إذا تم تعيين `ALLOW_PRODUCTION_DEMO_SEED=true`.

---

## 🖥️ تشغيل السيرفرات

### تشغيل سيرفر الـ Backend

```powershell
cd backend

# ✅ وضع التطوير (مع إعادة التشغيل التلقائي عند تعديل الكود)
npm run start:dev

# 🔍 وضع التطوير مع Debug
npm run start:debug

# 🚀 وضع الإنتاج (يتطلب بناء المشروع أولاً)
npm run build
npm run start:prod
```

**بعد التشغيل:**
- السيرفر يعمل على: `http://localhost:3000`
- توثيق الـ API (Swagger): `http://localhost:3000/api/docs`

### تشغيل سيرفر الـ Frontend

```powershell
cd frontend

# ✅ وضع التطوير (مع إعادة التحميل التلقائي)
npm run dev

# 🚀 وضع الإنتاج
npm run build
npm run start
```

**بعد التشغيل:**
- الواجهة تعمل على: `http://localhost:3001`

> [!IMPORTANT]
> **يجب تشغيل الـ Backend أولاً قبل الـ Frontend** لأن الواجهة الأمامية تعتمد على الـ API.

### تشغيل كلا السيرفرين معاً

افتح **نافذتين (terminals)** منفصلتين:

**النافذة 1 - Backend:**
```powershell
cd school-erp-platform\backend
npm run start:dev
```

**النافذة 2 - Frontend:**
```powershell
cd school-erp-platform\frontend
npm run dev
```

---

## ⚡ التشغيل التلقائي الكامل (طريقة سريعة)

المشروع يحتوي على ملف `run-full-project.bat` يقوم بكل شيء تلقائياً:

```powershell
# من مجلد المشروع الرئيسي
cd school-erp-platform

# تشغيل السكريبت بنقرة مزدوجة أو من الطرفية
.\run-full-project.bat
```

**ماذا يفعل هذا السكريبت؟**
1. 🧹 ينظف الكاش (يحذف `.next` و `dist`)
2. 📦 يثبّت الحزم (`npm install`) للباكيند والفرونتيند
3. ⚙️ يشغّل `prisma generate` و `prisma migrate deploy`
4. 🌱 يشغّل البذر (core + demo)
5. 🟢 يشغّل الـ Backend في نافذة جديدة
6. 🔵 يشغّل الـ Frontend في نافذة جديدة
7. 🌐 يفتح المتصفح على `http://localhost:3001`

---

## 🌿 أوامر Git و GitHub

### الأساسيات - للمبتدئين

#### 1. التحقق من حالة المشروع
```powershell
# عرض الملفات المعدّلة / الجديدة / المحذوفة
git status

# عرض التغييرات التفصيلية
git diff

# عرض التغييرات في ملف محدد
git diff path/to/file.ts
```

#### 2. حفظ التعديلات (Commit)

```powershell
# الخطوة 1: إضافة الملفات المعدّلة للـ staging
git add .                        # إضافة كل الملفات
git add backend/src/modules/     # إضافة مجلد محدد
git add frontend/src/app/page.tsx  # إضافة ملف محدد

# الخطوة 2: إنشاء commit مع رسالة واضحة
git commit -m "feat: إضافة صفحة الطلاب"
git commit -m "fix: إصلاح مشكلة تسجيل الدخول"
git commit -m "docs: تحديث التوثيق"
```

**قواعد كتابة رسائل الـ Commit:**
| البادئة | الاستخدام | مثال |
|---------|----------|------|
| `feat:` | ميزة جديدة | `feat: إضافة نظام الحضور` |
| `fix:` | إصلاح خطأ | `fix: إصلاح خطأ في حساب الدرجات` |
| `docs:` | توثيق | `docs: تحديث README` |
| `style:` | تنسيق الكود | `style: تنسيق ملفات CSS` |
| `refactor:` | إعادة هيكلة | `refactor: تحسين بنية الموديول` |
| `test:` | اختبارات | `test: إضافة اختبارات للـ API` |
| `chore:` | مهام عامة | `chore: تحديث الحزم` |

#### 3. رفع التعديلات إلى GitHub (Push)

```powershell
# رفع التعديلات إلى الفرع الحالي
git push

# رفع التعديلات إلى فرع محدد
git push origin main
git push origin develop
```

#### 4. جلب التعديلات من GitHub (Pull)

```powershell
# جلب آخر التعديلات من السيرفر ودمجها
git pull

# جلب التعديلات من فرع محدد
git pull origin main
```

### إدارة الفروع (Branches)

```powershell
# عرض كل الفروع
git branch              # الفروع المحلية
git branch -a           # كل الفروع (محلية + بعيدة)

# إنشاء فرع جديد والانتقال إليه
git checkout -b feature/student-attendance

# الانتقال إلى فرع موجود
git checkout main
git checkout develop

# حذف فرع محلي (بعد الدمج)
git branch -d feature/old-branch

# حذف فرع محلي بالقوة
git branch -D feature/old-branch
```

**تسمية الفروع الموصى بها:**
| النوع | المثال | الاستخدام |
|-------|--------|----------|
| `feature/` | `feature/student-grades` | ميزة جديدة |
| `fix/` | `fix/login-error` | إصلاح مشكلة |
| `hotfix/` | `hotfix/critical-bug` | إصلاح عاجل |

### دمج الفروع (Merge)

```powershell
# 1. انتقل إلى الفرع الرئيسي
git checkout main

# 2. ادمج الفرع المطلوب
git merge feature/student-attendance

# 3. ارفع التغييرات
git push origin main
```

### التعامل مع تعارضات الدمج (Merge Conflicts)

```powershell
# إذا ظهرت تعارضات عند الدمج:
# 1. افتح الملفات المتعارضة وحل التعارضات يدوياً
# 2. بعد حل التعارضات:
git add .
git commit -m "fix: حل تعارضات الدمج"

# إلغاء الدمج والرجوع للحالة السابقة
git merge --abort
```

### التراجع عن تعديلات

```powershell
# التراجع عن تعديلات في ملف لم يُضف للـ staging بعد
git checkout -- path/to/file.ts

# التراجع عن git add (إزالة من staging)
git reset HEAD path/to/file.ts
git reset HEAD .           # إزالة كل الملفات من staging

# التراجع عن آخر commit (مع الاحتفاظ بالتعديلات)
git reset --soft HEAD~1

# التراجع عن آخر commit (وحذف التعديلات نهائياً - تحذير!)
git reset --hard HEAD~1
```

### عرض سجل التعديلات (Log)

```powershell
# عرض آخر 10 تعديلات بشكل مختصر
git log --oneline -10

# عرض سجل مفصل
git log -5

# عرض سجل بياني للفروع
git log --oneline --graph --all -20
```

### حفظ تعديلات مؤقتاً (Stash)

```powershell
# حفظ التعديلات الحالية مؤقتاً (مفيد عند التبديل بين الفروع)
git stash

# استرجاع التعديلات المحفوظة
git stash pop

# عرض قائمة التعديلات المحفوظة
git stash list

# حذف كل التعديلات المحفوظة
git stash clear
```

---

## 🧪 أوامر الاختبار (Testing)

### اختبارات الـ Backend

```powershell
cd backend

# تشغيل جميع الاختبارات
npm test

# تشغيل الاختبارات مع المراقبة (يعيد التشغيل عند تعديل الكود)
npm run test:watch

# تشغيل الاختبارات مع تقرير التغطية
npm run test:cov

# تشغيل اختبارات E2E (End-to-End)
npm run test:e2e

# تشغيل اختبارات E2E للنظام المالي فقط
npm run test:e2e:finance
```

### اختبارات الـ Frontend (Playwright)

```powershell
cd frontend

# تشغيل جميع اختبارات E2E
npm run e2e

# تشغيل اختبارات بواجهة رسومية
npm run e2e:ui

# تشغيل الاختبارات مع عرض المتصفح
npm run e2e:headed

# اختبارات النظام المالي
npm run e2e:finance

# اختبارات الإطلاق
npm run e2e:release
```

### فحص الجودة الكامل (قبل الإطلاق)

```powershell
# Backend: lint + build + e2e tests
cd backend
npm run qa:release

# Frontend: lint + typecheck + build + e2e tests
cd frontend
npm run qa:release
```

---

## ✨ أوامر الجودة والتنسيق

### Backend

```powershell
cd backend

# فحص الكود (Lint) - عرض الأخطاء فقط
npm run lint:check

# فحص الكود مع الإصلاح التلقائي
npm run lint

# تنسيق الكود (Prettier)
npm run format
```

### Frontend

```powershell
cd frontend

# فحص الكود (ESLint)
npm run lint

# فحص الأنواع (TypeScript type-check)
npm run typecheck
```

---

## 📦 أوامر البناء والنشر (Production)

### بناء الـ Backend

```powershell
cd backend

# بناء المشروع (TypeScript → JavaScript)
npm run build

# تشغيل في وضع الإنتاج
npm run start:prod
# أو
npm start
```

### بناء الـ Frontend

```powershell
cd frontend

# بناء المشروع
npm run build

# تشغيل في وضع الإنتاج
npm run start
```

---

## 🔗 روابط ومنافذ المشروع

| الخدمة | الرابط المحلي | الوصف |
|--------|-------------|-------|
| **Frontend** | `http://localhost:3001` | واجهة المستخدم |
| **Backend API** | `http://localhost:3000` | سيرفر الـ API |
| **Swagger Docs** | `http://localhost:3000/api/docs` | توثيق الـ API التفاعلي |
| **Prisma Studio** | يُفتح تلقائياً (منفذ عشوائي) | واجهة استعراض قاعدة البيانات |
| **MySQL** | `localhost:3306` | قاعدة البيانات (عبر Docker) |

---

## 🛠️ حل المشاكل الشائعة (Troubleshooting)

### ❌ المشكلة: `prisma: command not found`
```powershell
# الحل: أعد تثبيت الحزم وتوليد Prisma
cd backend
npm install
npm run prisma:generate
```

### ❌ المشكلة: خطأ في الاتصال بقاعدة البيانات
```powershell
# تحقق أن قاعدة البيانات تعمل
docker compose ps   # إذا كنت تستخدم Docker

# تحقق من DATABASE_URL في ملف .env
# تأكد أن المنفذ 3306 غير مستخدم من برنامج آخر
```

### ❌ المشكلة: `Module not found` أو أخطاء في الحزم
```powershell
# الحل: احذف node_modules وأعد التثبيت
cd backend
Remove-Item -Recurse -Force node_modules
npm install

cd ..\frontend
Remove-Item -Recurse -Force node_modules
npm install
```

### ❌ المشكلة: المنفذ مستخدم (Port already in use)
```powershell
# اعثر على العملية التي تستخدم المنفذ واقتلها
# للمنفذ 3000 (Backend):
netstat -ano | findstr :3000
taskkill /PID <رقم_العملية> /F

# للمنفذ 3001 (Frontend):
netstat -ano | findstr :3001
taskkill /PID <رقم_العملية> /F
```

### ❌ المشكلة: تغييرات Prisma Schema لا تظهر
```powershell
cd backend

# أعد توليد Prisma Client
npm run prisma:generate

# إذا أضفت تعديلات على schema.prisma:
npm run prisma:migrate:dev
```

### ❌ المشكلة: الواجهة الأمامية لا تتصل بالـ Backend
```powershell
# تحقق من:
# 1. أن الـ Backend يعمل على المنفذ 3000
# 2. أن ملف frontend/.env.local يحتوي:
#    BACKEND_API_URL=http://localhost:3000
#    NEXT_PUBLIC_API_PROXY_PREFIX=/backend
# 3. أن CORS_ORIGIN في backend/.env يطابق رابط الـ Frontend
```

### ❌ المشكلة: أخطاء TypeScript عند البناء
```powershell
# Frontend: فحص الأخطاء
cd frontend
npm run typecheck

# Backend: فحص الأخطاء
cd backend
npm run lint:check
```

---

## 📋 ملخص سريع (Cheat Sheet)

### 🟢 بداية يوم العمل
```powershell
# 1. جلب آخر التعديلات
git pull

# 2. تشغيل الـ Backend (نافذة 1)
cd backend && npm run start:dev

# 3. تشغيل الـ Frontend (نافذة 2)
cd frontend && npm run dev

# 4. افتح المتصفح على http://localhost:3001
```

### 🔵 دورة العمل اليومية
```powershell
# 1. اعمل على فرع جديد
git checkout -b feature/my-new-feature

# 2. اكتب الكود وعدّل الملفات...

# 3. احفظ التعديلات
git add .
git commit -m "feat: وصف التعديل"

# 4. ارفع الفرع
git push origin feature/my-new-feature

# 5. افتح Pull Request على GitHub
```

### 🔴 نهاية يوم العمل
```powershell
# 1. احفظ كل التعديلات
git add .
git commit -m "wip: حفظ تعديلات اليوم"
git push

# 2. أوقف السيرفرات: اضغط Ctrl+C في كل نافذة
```

### 🗄️ أوامر قاعدة البيانات السريعة
```powershell
cd backend
npm run prisma:generate          # توليد الكلاينت
npm run prisma:migrate:deploy    # تطبيق الترحيلات
npm run prisma:seed:core         # بيانات أساسية
npm run prisma:studio            # فتح واجهة الاستعراض
```

---

> [!TIP]
> **نصيحة للمبتدئين:** ابدأ دائماً بـ `git pull` للحصول على آخر التعديلات، ثم شغّل الـ Backend ثم الـ Frontend. إذا واجهت مشاكل، جرّب حذف `node_modules` وإعادة `npm install`.

---

*آخر تحديث: أبريل 2026*
