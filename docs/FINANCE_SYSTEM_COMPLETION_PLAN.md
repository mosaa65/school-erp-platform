# 📊 تقرير تحليل النظام المالي — تقييم التقدم وخطة الإكمال

## التاريخ: 2026-03-17 | المعد: تحليل شامل لملفات التخطيط مقابل التنفيذ الفعلي

---

> [!WARNING]
> **تنبيه تحديث 2026-03-28:** هذا الملف أصبح مرجعًا تاريخيًا لالتقاط الحالة في `2026-03-17`، وليس مرجع الحالة الحالية.
> للوضع التنفيذي الأحدث راجع:
> - `school-erp-docs/07_النظام_المالي/finance_gap_matrix.md`
> - `school-erp-docs/07_النظام_المالي/finance_p0_backlog.md`
> - `school-erp-docs/07_النظام_المالي/advanced_finance_integration.md`
> - `school-erp-docs/07_النظام_المالي/billing_contract_decision.md`
>
> **مهم:** بعض checklists أدناه ستظهر غير منجزة لأنها تعكس لقطة `2026-03-17` فقط.
> من البنود التي أصبحت منفذة لاحقًا: `payroll-summary`, `employee-balance`, `inventory/adjustment-journal`, `vendor-balance`, `transport/revenue-report`.

---

## 📑 الملخص التنفيذي

تم تحليل **6 ملفات تخطيط وتحليل** في مجلد `school-erp-docs/07_النظام_المالي/` ومقارنتها بالتنفيذ الفعلي في `school-erp-platform/backend/`.

**النتيجة التاريخية في 2026-03-17:** النظام المالي كان في **نهاية Sprint 1 (المرحلة 1)** من أصل 4 مراحل مخطط لها، مع بداية Sprint 3 في جانب بوابات الدفع.  
**ملاحظة تاريخية:** هذا الاستنتاج لا يعكس التنفيذ الأحدث بعد الإضافات اللاحقة في الفوترة والتقارير والتكاملات.

| المرحلة                          | الوصف               | نسبة الإنجاز | الحالة         |
| -------------------------------- | ------------------- | ------------ | -------------- |
| **Sprint 1** — الأساس المحاسبي   | ✅ مكتمل بنسبة ~85% | 🟢 شبه مكتمل |
| **Sprint 2** — الفوترة والتحصيل  | ⚠️ تصميم فقط        | ~10%         | 🟡 مخطط جاهز   |
| **Sprint 3** — بوابات الدفع      | ⚠️ جزئي (~60%)      | 60%          | 🟡 قيد التنفيذ |
| **Sprint 4** — التكاملات والتوسع | ❌ لم يبدأ          | 0%           | 🔴 لم يبدأ     |

---

## 📋 القسم الأول: تحليل ملفات التخطيط

### الملفات المحللة:

| #   | الملف                              | الحجم | المحتوى                                             |
| --- | ---------------------------------- | ----- | --------------------------------------------------- |
| 1   | `README.md`                        | 11KB  | التوثيق الشامل — 12 صندوق، 27 تصنيف، 10 أقسام       |
| 2   | `DDL.sql`                          | 91KB  | هيكلية قاعدة البيانات الموحدة (~1500 سطر) — 35 جدول |
| 3   | `engineering_report_v3.2.md`       | 12KB  | التقرير الهندسي — 28 جدول Advanced + 7 Legacy       |
| 4   | `advanced_finance_architecture.md` | 11KB  | تحليل الوضع الراهن + سيناريوهات تدفق البيانات       |
| 5   | `advanced_finance_integration.md`  | 10KB  | خطة التكامل — 30+ API Endpoint                      |
| 6   | `advanced_finance_phases.md`       | 14KB  | خطة التنفيذ المرحلية — 4 Sprints (22 أسبوع)         |

### ما تتطلبه الخطة الكاملة:

- **35 جدول** (28 Advanced + 7 Legacy)
- **8 Views** تقاريرية
- **2 Triggers** لحماية الفترات
- **30+ API Endpoint**
- **12 صندوق مالي** + **27 تصنيف**
- **36 حساب** في شجرة الحسابات
- **5 أكواد ضريبية**

---

## 📋 القسم الثاني: ما تم بناؤه فعلياً

### 2.1 قاعدة البيانات (Prisma Schema)

#### ✅ النماذج المطبقة فعلياً عبر Migrations (12 جدول):

| #   | النموذج (Model)                             | السطور في Schema | الحالة   |
| --- | ------------------------------------------- | ---------------- | -------- |
| 1   | `Branch`                                    | 3386-3411        | ✅ مكتمل |
| 2   | `Currency`                                  | 3413-3438        | ✅ مكتمل |
| 3   | `CurrencyExchangeRate`                      | 3440-3464        | ✅ مكتمل |
| 4   | `FiscalYear`                                | 3466-3495        | ✅ مكتمل |
| 5   | `FiscalPeriod`                              | 3497-3534        | ✅ مكتمل |
| 6   | `ChartOfAccount`                            | 3536-3574        | ✅ مكتمل |
| 7   | `JournalEntry`                              | 3576-3630        | ✅ مكتمل |
| 8   | `JournalEntryLine`                          | 3632-3667        | ✅ مكتمل |
| 9   | `PaymentGateway`                            | 3223-3247        | ✅ مكتمل |
| 10  | `PaymentTransaction`                        | 3249-3294        | ✅ مكتمل |
| 11  | `PaymentWebhookEvent`                       | 3296-3318        | ✅ مكتمل |
| 12  | `BankReconciliation` + `ReconciliationItem` | 3320-3384        | ✅ مكتمل |

#### ✅ الـ Enums المنفذة (10):

- `PaymentGatewayType` (ONLINE, OFFLINE)
- `PaymentMethod` (CASH, CARD, BANK_TRANSFER, MOBILE_WALLET, CHEQUE)
- `PaymentTransactionStatus` (PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED)
- `PaymentWebhookEventType` (SUCCESS, FAILURE, REFUND)
- `PaymentWebhookEventStatus` (RECEIVED, PROCESSED, IGNORED, FAILED)
- `BankReconciliationStatus` (OPEN, IN_PROGRESS, RECONCILED)
- `ReconciliationItemType` (MATCHED, UNMATCHED_BANK, UNMATCHED_BOOK)
- `AccountType` (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
- `NormalBalance` (DEBIT, CREDIT)
- `FiscalPeriodType` / `FiscalPeriodStatus` / `JournalEntryStatus`

#### ⚠️ نماذج موجودة في Schema فقط (بدون Migrations) — Sprint 2:

- `fin_tax_codes` (TaxCode)
- `fee_structures` (FeeStructure)
- `discount_rules` (DiscountRule)
- `student_invoices` (StudentInvoice)
- `invoice_line_items` (InvoiceLineItem)
- `invoice_installments` (InvoiceInstallment)

#### ❌ الجداول المخطط لها وغير الموجودة في Schema أو Migrations (17 جدول):

| #   | الجدول                        | القسم           | Sprint   | الأولوية |
| --- | ----------------------------- | --------------- | -------- | -------- |
| 1   | `financial_funds`             | Legacy          | —        | متوسطة   |
| 2   | `financial_categories`        | Legacy          | —        | متوسطة   |
| 3   | `revenues`                    | Legacy          | —        | متوسطة   |
| 4   | `expenses`                    | Legacy          | —        | متوسطة   |
| 5   | `community_contributions`     | Legacy          | —        | متوسطة   |
| 6   | `lookup_payment_types`        | Legacy          | —        | منخفضة   |
| 7   | `lookup_exemption_reasons`    | Legacy          | —        | منخفضة   |
| 8   | `audit_trail`                 | التدقيق         | Sprint 4 | عالية    |
| 9   | `budgets`                     | الميزانيات      | Sprint 4 | عالية    |
| 10  | `budget_lines`                | الميزانيات      | Sprint 4 | عالية    |
| 11  | `credit_debit_notes`          | المذكرات        | Sprint 4 | متوسطة   |
| 12  | `document_sequences`          | الترقيم         | Sprint 4 | متوسطة   |
| 13  | `recurring_journal_templates` | القيود المتكررة | Sprint 4 | متوسطة   |
| 14  | `recurring_template_lines`    | القيود المتكررة | Sprint 4 | متوسطة   |
| 15  | `cost_centers`                | مراكز التكلفة   | Sprint 4 | متوسطة   |
| 16  | `lookup_contribution_amounts` | Legacy          | —        | منخفضة   |
| 17  | `financial_view_logs`         | Legacy          | —        | منخفضة   |

### 2.2 الـ Backend (NestJS Modules)

#### ✅ الوحدات المنفذة (11 module):

| #   | الوحدة                    | Controller | Service | DTOs | العمليات المدعومة                                   |
| --- | ------------------------- | ---------- | ------- | ---- | --------------------------------------------------- |
| 1   | `branches`                | ✅         | ✅      | 3    | CRUD                                                |
| 2   | `currencies`              | ✅         | ✅      | 3    | CRUD                                                |
| 3   | `currency-exchange-rates` | ✅         | ✅      | 3    | CRUD                                                |
| 4   | `fiscal-years`            | ✅         | ✅      | 3    | CRUD                                                |
| 5   | `fiscal-periods`          | ✅         | ✅      | 3    | CRUD                                                |
| 6   | `chart-of-accounts`       | ✅         | ✅      | 3    | CRUD                                                |
| 7   | `journal-entries`         | ✅         | ✅      | 3    | CRUD + **Approve + Post + Reverse** ✅ (تم الإضافة) |
| 8   | `payment-gateways`        | ✅         | ✅      | 3    | CRUD                                                |
| 9   | `payment-transactions`    | ✅         | ✅      | 4    | CRUD + Simulate + Reconcile                         |
| 10  | `payment-webhooks`        | ✅         | ✅      | 3    | Success/Failure/Refund                              |
| 11  | `bank-reconciliations`    | ✅         | ✅      | 4    | CRUD + Reconcile                                    |

#### ❌ الوحدات غير المنفذة (المطلوبة حسب الخطة):

| #   | الوحدة المطلوبة           | Sprint     | عدد الـ APIs المخططة                     |
| --- | ------------------------- | ---------- | ---------------------------------------- |
| 1   | `fee-structures`          | Sprint 2   | 5+                                       |
| 2   | `discount-rules`          | Sprint 2   | 5+                                       |
| 3   | `student-invoices`        | Sprint 2   | 6+                                       |
| 4   | `invoice-installments`    | Sprint 2   | 4+                                       |
| 5   | `tax-configurations`      | Sprint 2   | 3+                                       |
| 6   | `hr-payroll-integration`  | Sprint 4   | 4                                        |
| 7   | `procurement-integration` | Sprint 4   | 5                                        |
| 8   | `transport-integration`   | Sprint 4   | 4                                        |
| 9   | `billing-engine`          | Sprint 2-4 | 6                                        |
| 10  | `budgets`                 | Sprint 4   | 4+                                       |
| 11  | `credit-debit-notes`      | Sprint 4   | 3+                                       |
| 12  | `recurring-journals`      | Sprint 4   | 3+                                       |
| 13  | `cost-centers`            | Sprint 4   | 3+                                       |
| 14  | `financial-reports`       | Sprint 1+4 | ✅ **تم (Trial Balance + GL + Summary)** |

### 2.3 الصلاحيات (Permissions)

#### ✅ الصلاحيات المنفذة (مسجلة في permissions.seed.ts):

- `branches.create/read/update/delete` ✅
- `currencies.create/read/update/delete` ✅
- `currency-exchange-rates.create/read/update/delete` ✅
- `fiscal-years.create/read/update/delete` ✅
- `fiscal-periods.create/read/update/delete` ✅
- `chart-of-accounts.create/read/update/delete` ✅
- `journal-entries.create/read/update/delete` ✅
- `payment-gateways.create/read/update/delete` ✅
- `payment-transactions.create/read/update/delete/simulate/reconcile` ✅
- `bank-reconciliations.create/read/update/delete` ✅

#### ❌ صلاحيات غير منفذة (مطلوبة):

- `fee-structures.*`
- `student-invoices.*`
- `discount-rules.*`
- `budgets.*`
- `tax-configurations.*`
- `financial-reports.read` ✅ (تم الإضافة)
- `journal-entries.approve/post/reverse` ✅ (تم الإضافة)
- `fee-structures.*`
- وغيرها...

### 2.4 البيانات البذرية (Seeds)

#### ✅ المنفذ:

- `finance-core.seed.ts`: فرع واحد (MAIN) + 3 عملات (SAR, USD, YER) + **36 حساب كامل** ✅ (تم التحديث)
- `payment-gateways.seed.ts`: **3 بوابات** (CASH_GW + BANK_GW + ONLINE_GW) ✅ (تم التحديث)
- `finance-core.seed.ts`: **سنة مالية + 12 فترة شهرية** ✅ (تم الإضافة)

#### ❌ غير المنفذ:

- 12 صندوق مالي
- 27 تصنيف مالي
- بذور الفوترة (هياكل رسوم، خصومات، أكواد ضريبية)
- 5 مراكز تكلفة
- 6 تسلسلات ترقيم

### 2.5 الواجهة الأمامية (Frontend)

#### ❌ لا توجد أي صفحات frontend للنظام المالي!

- لا يوجد أي feature folder متعلق بالـ Finance في `frontend/src/features/`
- لا توجد صفحات إدارة مالية في واجهة المستخدم

### 2.6 الـ Migrations المنفذة:

| #   | Migration                    | التاريخ    |
| --- | ---------------------------- | ---------- |
| 1   | `add_payment_gateways`       | 2026-03-12 |
| 2   | `add_payment_transactions`   | 2026-03-12 |
| 3   | `add_finance_core`           | 2026-03-14 |
| 4   | `add_payment_reconciliation` | 2026-03-15 |
| 5   | `add_bank_reconciliation`    | 2026-03-16 |
| 6   | `add_payment_webhooks`       | 2026-03-16 |

> لا يوجد حتى الآن Migration مخصص لجداول الفوترة (Fee Structures / Invoices / Tax Codes).

### 2.7 التقارير والـ Views

#### ❌ لم تُنفذ أي تقارير من الـ 9 المخطط لها:

- ❌ `v_general_ledger` — دفتر الأستاذ
- ❌ `v_trial_balance` — ميزان المراجعة
- ❌ `v_student_account_statement` — كشف حساب الطالب
- ❌ `v_vat_return_report` — التقرير الضريبي
- ❌ `v_budget_vs_actual` — الميزانيات
- ❌ `v_accounts_receivable_aging` — أعمار الديون
- ❌ `v_unified_financial_status` — أرصدة الصناديق
- ❌ `v_community_contributions_analysis` — تحليل المساهمات
- ❌ Income Statement / Balance Sheet

---

## 📋 القسم الثالث: خطة إكمال النظام المالي

### 🎯 الاستراتيجية: "البناء المتدرج — الأهم أولاً"

#### بناءً على الأولوية والاعتماديات، نقسم العمل إلى 6 مراحل:

---

### المرحلة 1: إكمال الأساس المحاسبي (Sprint 1 Completion) — أسبوع 1

> **الأولوية: حرجة** | **المقدر: 5-7 أيام**

#### 1.1 إكمال بيانات شجرة الحسابات (Seeds)

- [x] ✅ توسيع `finance-core.seed.ts` ليشمل الـ 36 حساب كاملة بدل 8 — **تم التنفيذ**
  ```
  الحسابات المطلوبة إضافتها:
  1100 - النقدية (Cash) ← ✅ موجود
  1101 - البنك الرئيسي
  1102 - بوابة الدفع الإلكتروني
  1103 - الصندوق النثري
  1104 - ذمم موظفين (سلف)
  1110 - حساب بنكي ← ✅ موجود
  1200 - أصول ثابتة
  1201 - مباني ومنشآت
  1202 - أثاث ومعدات
  1203 - مجمع الإهلاك
  2000 - التزامات ← ✅ موجود
  2100 - التزامات متداولة
  2101 - ذمم دائنة (موردون)
  2102 - رواتب مستحقة
  2103 - ضريبة مخرجات مستحقة
  2104 - ضريبة مدخلات
  3000 - حقوق ملكية ← ✅ موجود
  3100 - رأس المال
  3200 - أرباح محتجزة
  4000 - إيرادات ← ✅ موجود
  4001 - إيراد الرسوم الدراسية
  4002 - إيراد المساهمة المجتمعية
  4003 - إيراد رسوم النقل
  4004 - إيراد الأنشطة
  4005 - إيراد المقصف
  4006 - إيرادات متنوعة
  4100 - Tuition Revenue ← ✅ موجود
  5000 - مصروفات ← ✅ موجود
  5001 - مصروف الرواتب
  5002 - مصروف الصيانة
  5003 - مصروف الوقود والنقل
  5004 - مصروف المشتريات
  5005 - مصروف الإهلاك
  5006 - مصروف المرافق
  5007 - مصروف خصومات (Contra Revenue)
  ```

#### 1.2 إضافة دورة اعتماد القيود (Approve → Post → Reverse)

- [x] ✅ إضافة endpoints في `journal-entries.controller.ts` — **تم التنفيذ**:
  - `PATCH /finance/journal-entries/:id/approve`
  - `PATCH /finance/journal-entries/:id/post`
  - `POST /finance/journal-entries/:id/reverse`
- [x] ✅ إضافة business logic في Service — **تم التنفيذ**:
  - التحقق من توازن المدين والدائن
  - تحديث أرصدة الحسابات عند الترحيل
  - إنشاء قيد معاكس عند العكس

#### 1.3 إنشاء وحدة التقارير المالية الأساسية

- [x] ✅ إنشاء `backend/src/modules/finance/financial-reports/` — **تم التنفيذ**
  - `GET /finance/reports/trial-balance` — ميزان المراجعة
  - `GET /finance/reports/general-ledger` — دفتر الأستاذ
  - `GET /finance/reports/account-summary` — ملخص الحسابات
- [x] ✅ إضافة الصلاحيات: `financial-reports.read` — **تم التنفيذ**

#### 1.4 إضافة FiscalPeriods Seed

- [x] ✅ إنشاء بيانات السنة المالية + 12 فترة شهرية مرتبطة — **تم التنفيذ**

#### شروط القبول (DoD):

- [x] ✅ شجرة حسابات كاملة (36 حساب) محملة من Seed
- [x] ✅ قيد يدوي يمكن إنشاؤه → اعتماده → ترحيله → عكسه
- [x] ✅ ميزان المراجعة متوازن دائماً
- [x] ✅ API تقرير دفتر الأستاذ وميزان المراجعة يعملان

---

### المرحلة 2: نظام الفوترة والتحصيل — أسبوع 2-3

> **الأولوية: حرجة** | **المقدر: 10-14 يوم**

#### 2.1 إنشاء جداول الفوترة في Prisma Schema

- [x] `FeeStructure` — موجود في schema
- [x] `DiscountRule` — موجود في schema
- [x] `StudentInvoice` — موجود في schema
- [x] `InvoiceLineItem` — موجود في schema
- [x] `InvoiceInstallment` — موجود في schema
- [x] `TaxCode` (fin_tax_codes) — موجود في schema

#### 2.2 إنشاء Migrations

- [ ] Migration لجداول الفوترة

#### 2.3 إنشاء Backend Modules

##### fee-structures module:

- [ ] `POST /finance/fee-structures` — إنشاء هيكل رسوم
- [ ] `GET /finance/fee-structures` — عرض قائمة
- [ ] `GET /finance/fee-structures/:id` — عرض تفاصيل
- [ ] `PATCH /finance/fee-structures/:id` — تحديث
- [ ] `DELETE /finance/fee-structures/:id` — حذف ناعم

##### discount-rules module:

- [ ] CRUD كامل
- [ ] محرك خصم الإخوة الآلي

##### student-invoices module:

- [ ] `POST /finance/billing/generate-student-invoice` — إنشاء فاتورة لطالب
- [ ] `POST /finance/billing/bulk-generate` — توليد فواتير جماعية
- [ ] `GET /finance/billing/student-statement/:id` — كشف حساب الطالب
- [ ] `GET /finance/billing/family-balance/:guardianId` — رصيد العائلة

##### invoice-installments module:

- [ ] CRUD + تحديث حالة القسط عند الدفع

#### 2.4 Seeds

- [ ] بيانات هياكل رسوم تجريبية
- [ ] قواعد خصم (إخوة 10%/20%)
- [ ] 5 أكواد ضريبية (VAT15, VAT5, VAT0, EXEMPT, VAT_IN15)

#### 2.5 إضافة الصلاحيات

- [ ] `fee-structures.create/read/update/delete`
- [ ] `discount-rules.create/read/update/delete`
- [ ] `student-invoices.create/read/update/delete`
- [ ] `invoice-installments.create/read/update/delete`
- [ ] `tax-configurations.create/read/update/delete`

#### شروط القبول:

- [ ] فاتورة طالب تُصدر بنجاح مع أقساط
- [ ] خصم الإخوة يُحتسب تلقائياً
- [ ] كشف حساب الطالب يعرض كل العمليات
- [ ] كل دفع ناجح ← فاتورة محدثة + قيد يومية

---

### المرحلة 3: استكمال بوابات الدفع والربط — أسبوع 3-4

> **الأولوية: عالية** | **المقدر: 5-7 أيام**

#### 3.1 ربط المدفوعات بالفواتير

- [ ] تحديث `PaymentTransaction` لربطها بـ `InvoiceInstallment`
- [ ] إنشاء القيود التلقائية عند نجاح كل دفع:
  - مدين: حساب البنك/النقدية
  - دائن: إيراد الرسوم
- [ ] تحديث حالة القسط تلقائياً (PENDING → PAID)

#### 3.2 إضافة بوابات الدفع البذرية

- [ ] توسيع `payment-gateways.seed.ts`:
  - بوابة نقدية (CASH_GW)
  - بوابة بنكية (BANK_GW)
  - بوابة إلكترونية ← ✅ موجودة

#### 3.3 تحسين Webhook Security

- [ ] التحقق من HMAC-SHA256
- [ ] IP Whitelist
- [ ] Idempotency key validation

#### 3.4 الإيصالات الرقمية

- [ ] `GET /finance/payment-transactions/:id/receipt` — إيصال رقمي

#### شروط القبول:

- [ ] دفع ناجح ← قيد مزدوج تلقائي ← تحديث الفاتورة
- [ ] Webhook آمن مع HMAC + Idempotency
- [ ] إيصال رقمي لكل عملية دفع

---

### المرحلة 4: النظام القديم (Legacy) والجسر — أسبوع 4-5

> **الأولوية: متوسطة-عالية** | **المقدر: 5-7 أيام**

#### 4.1 إنشاء جداول Legacy في Prisma

- [ ] `FinancialFund` (12 صندوق)
- [ ] `FinancialCategory` (27 تصنيف)
- [ ] `Revenue` + `Expense` + `CommunityContribution`
- [ ] جداول Lookup: `LookupPaymentType`, `LookupExemptionReason`, `LookupContributionAmount`

#### 4.2 إضافة أعمدة Bridge

- [ ] `coa_account_id` في `financial_categories` و `financial_funds`
- [ ] `journal_entry_id` في `revenues` و `expenses`
- [ ] `invoice_id` + `journal_entry_id` في `community_contributions`

#### 4.3 إنشاء Backend Modules

- [ ] `financial-funds/` — إدارة الصناديق
- [ ] `financial-categories/` — إدارة التصنيفات
- [ ] `revenues/` — إدارة الإيرادات
- [ ] `expenses/` — إدارة المصروفات
- [ ] `community-contributions/` — المساهمات المجتمعية

#### 4.4 Seeds

- [ ] 12 صندوق مالي
- [ ] 27 تصنيف مالي (15 إيراد + 12 مصروف)

---

### المرحلة 5: التكاملات المتقدمة — أسبوع 5-7

> **الأولوية: عالية** | **المقدر: 10-14 يوم**

#### 5.1 جداول متقدمة إضافية

- [ ] `Budget` + `BudgetLine` — إدارة الميزانيات
- [ ] `CreditDebitNote` — مذكرات الائتمان/الخصم
- [ ] `DocumentSequence` — الترقيم التسلسلي (6 أنواع)
- [ ] `RecurringJournalTemplate` + `RecurringTemplateLine` — القيود المتكررة
- [ ] `CostCenter` — مراكز التكلفة (5 مراكز)
- [ ] `AuditTrail` — سجل التدقيق الشامل

#### 5.2 تكامل HR → Finance

- [ ] `POST /finance/hr/payroll-journal` — قيد رواتب شهري
- [ ] `POST /finance/hr/deduction-journal` — قيد خصم فردي
- [ ] `GET /finance/hr/payroll-summary/:month`
- [ ] `GET /finance/hr/employee-balance/:id`

#### 5.3 تكامل SIS → Finance (الطلاب → المالية)

- [ ] `POST /finance/billing/process-withdrawal` — معالجة انسحاب (Proration)
- [ ] `POST /finance/billing/apply-sibling-discount` — خصم إخوة آلي

#### 5.4 التقارير المتقدمة

- [ ] `GET /finance/reports/income-statement` — قائمة الدخل
- [ ] `GET /finance/reports/balance-sheet` — الميزانية العمومية
- [ ] `GET /finance/reports/vat-report` — التقرير الضريبي
- [ ] `GET /finance/reports/budget-vs-actual` — الميزانية مقابل الفعلي
- [ ] `GET /finance/reports/accounts-receivable-aging` — أعمار الديون
- [ ] `GET /finance/reports/student-account-statement/:id` — كشف حساب الطالب

#### 5.5 Seeds المتقدمة

- [ ] 5 مراكز تكلفة
- [ ] 6 تسلسلات ترقيم
- [ ] 5 أكواد ضريبية

---

### المرحلة 6: الواجهة الأمامية (Frontend) — أسبوع 7-10

> **الأولوية: حرجة** | **المقدر: 14-21 يوم**

#### 6.1 الصفحات الأساسية (Sprint 1 Frontend):

- [ ] صفحة الفروع `/finance/branches`
- [ ] صفحة العملات `/finance/currencies`
- [ ] صفحة أسعار الصرف `/finance/exchange-rates`
- [ ] صفحة السنوات المالية `/finance/fiscal-years`
- [ ] صفحة الفترات المالية `/finance/fiscal-periods`
- [ ] صفحة شجرة الحسابات `/finance/chart-of-accounts` (عرض شجري)
- [ ] صفحة القيود اليومية `/finance/journal-entries` (CRUD + Approve + Post)

#### 6.2 صفحات الفوترة (Sprint 2 Frontend):

- [ ] صفحة هياكل الرسوم `/finance/fee-structures`
- [ ] صفحة قواعد الخصم `/finance/discount-rules`
- [ ] صفحة فواتير الطلاب `/finance/invoices`
- [ ] صفحة كشف حساب الطالب `/finance/student-statement/:id`

#### 6.3 صفحات الدفع (Sprint 3 Frontend):

- [ ] صفحة بوابات الدفع `/finance/payment-gateways`
- [ ] صفحة المعاملات المالية `/finance/transactions`
- [ ] صفحة التسويات البنكية `/finance/reconciliation`

#### 6.4 صفحات التقارير:

- [ ] لوحة معلومات مالية `/finance/dashboard`
- [ ] ميزان المراجعة `/finance/reports/trial-balance`
- [ ] دفتر الأستاذ `/finance/reports/general-ledger`
- [ ] قائمة الدخل `/finance/reports/income-statement`
- [ ] الميزانية العمومية `/finance/reports/balance-sheet`

#### 6.5 إضافة النظام المالي للقائمة الجانبية

- [ ] إضافة مجموعة "النظام المالي" في `app-navigation.ts`

---

## 📊 الجدول الزمني المقترح

```
الأسبوع 1:   ████████░░ المرحلة 1 — إكمال الأساس المحاسبي
الأسبوع 2-3: ████████░░ المرحلة 2 — الفوترة والتحصيل
الأسبوع 3-4: ██████░░░░ المرحلة 3 — ربط بوابات الدفع
الأسبوع 4-5: ██████░░░░ المرحلة 4 — النظام القديم والجسر
الأسبوع 5-7: ████████░░ المرحلة 5 — التكاملات المتقدمة
الأسبوع 7-10:██████████ المرحلة 6 — الواجهة الأمامية
```

**المجموع المقدر:** 8-10 أسابيع عمل

---

## 📈 ملخص الفجوات

| الفئة               | المخطط  | المنفذ     | المتبقي           | نسبة الإنجاز |
| ------------------- | ------- | ---------- | ----------------- | ------------ |
| **جداول DB**        | 35      | 12 مطبقة + 6 تصميم | 17                | ~34% مطبق |
| **Backend Modules** | 25+     | 11         | 14+               | ~44%         |
| **API Endpoints**   | 30+     | ~55 (CRUD) | 20+ (specialized) | ~60%         |
| **Permissions**     | 60+     | 42         | 18+               | ~70%         |
| **Seeds**           | شاملة   | أساسية فقط | كثيرة             | ~20%         |
| **Frontend Pages**  | 20+     | 0          | 20+               | 0%           |
| **التقارير**        | 9 Views | 0          | 9                 | 0%           |
| **Triggers**        | 2       | 0          | 2                 | 0%           |

### **النسبة الإجمالية للتقدم: ~30-35%**

---

## 🚨 الأولويات الحرجة (ابدأ بها أولاً)

1. **إنشاء Migrations للفوترة** — تحويل نماذج schema إلى جداول فعلية
2. **بناء Modules الفوترة والتحصيل** — تشغيل الفواتير والأقساط والخصومات
3. **ربط الدفع بالفواتير** — قيد تلقائي + تحديث الأقساط
4. **Views وTriggers المالية** — ميزان المراجعة + حماية الفترات
5. **الواجهة الأمامية** — لا يمكن استخدام النظام بدونها

---

**شركة إنما سوفت للحلول التقنية (InmaSoft)** | 2026-03-17
