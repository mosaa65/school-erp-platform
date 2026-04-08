# خطة تطوير تسجيل الدخول والأمان

Date: 2026-04-08

## الهدف

هذه الخطة تحول نظام الدخول الحالي في المشروع إلى نظام احترافي وآمن يدعم:

1. تسجيل الدخول عبر البريد الإلكتروني أو رقم الهاتف.
2. إدارة جلسات قوية عبر Access Token + Refresh Token.
3. طبقات حماية إضافية: Rate Limiting, Bot Protection, Device Tracking, Login Notifications.
4. قابلية تفعيل MFA ثم WebAuthn بشكل مرحلي.

## تحليل الوضع الحالي في المشروع

## Backend (NestJS + Prisma)

الوضع الحالي فعليًا:

1. الدخول الحالي يعتمد `email + password` فقط.
2. كلمة المرور مشفرة بـ `bcrypt`.
3. عند نجاح الدخول يتم إصدار `JWT` واحد فقط (لا يوجد Refresh Token flow).
4. يتم تحديث `lastLoginAt` للمستخدم فقط بعد نجاح الدخول.
5. لا يوجد استخدام فعلي لجدول `sessions` الموجود في Prisma داخل كود المصادقة الحالي.
6. لا توجد طبقات حماية مفعلة حاليًا مثل:
   - rate limiting مخصص لنقطة `/auth/login`
   - CAPTCHA
   - MFA
   - WebAuthn
7. `JWT_SECRET` في البيئة الحالية ما زال بالقيمة الافتراضية ويجب تغييره فورًا قبل الإنتاج.

مراجع مهمة:

- `backend/src/auth/auth.service.ts`
- `backend/src/auth/dto/login.dto.ts`
- `backend/src/auth/auth.module.ts`
- `backend/prisma/schema.prisma` (models: `User`, `UserSession`)

## Frontend (Next.js)

الوضع الحالي فعليًا:

1. شاشة الدخول تقبل `email + password` فقط.
2. التوكن يُحفظ في `localStorage`.
3. توجد cookie للتوكن لكنها ليست HttpOnly (لأنها تُنشأ من JavaScript).
4. جميع الطلبات المحمية تضيف `Authorization: Bearer <accessToken>` من التخزين المحلي.
5. لا توجد آلية refresh تلقائية للجلسة عند انتهاء access token.

مراجع مهمة:

- `frontend/src/features/auth/components/login-screen.tsx`
- `frontend/src/lib/auth/session.ts`
- `frontend/src/lib/api/client.ts`
- `frontend/middleware.ts`

## الرؤية المستهدفة (Target Architecture)

## 1) Login Layer

يدعم النظام مدخل موحد `loginId` يمكن أن يكون:

1. بريد إلكتروني.
2. رقم هاتف مع مفتاح الدولة.

المصادقة الأساسية:

1. Password hashing: `Argon2id`.
2. MFA (اختياري مرحلي): TOTP.
3. WebAuthn (اختياري متقدم لاحقًا).

## 2) Session Layer

1. Access Token (JWT): مدة قصيرة `10-15 دقيقة`.
2. Refresh Token: مدة `7-30 يوم` حسب السياسة.
3. Refresh Token في `HttpOnly + Secure + SameSite` cookie.
4. Rotation لكل refresh token (one-time use) مع الإبطال عند الاشتباه.

## 3) Security Layer

1. Rate limiting على `/auth/login` و `/auth/refresh`.
2. CAPTCHA بعد فشل متكرر أو حسب risk score.
3. Device tracking:
   - `deviceId`
   - `ip`
   - `userAgent`
   - `lastSeenAt`
4. إشعارات تسجيل دخول جديد.
5. HTTPS فقط في الإنتاج.

## نموذج البيانات المقترح

## User (توسعة)

إضافة حقول لهوية الهاتف:

1. `phoneCountryCode` مثال: `+967`.
2. `phoneNationalNumber` الرقم المحلي.
3. `phoneE164` مثال: `+9677XXXXXXX` (Unique, Nullable).

ملاحظات:

1. البريد يبقى `unique`.
2. الهاتف يمر بتطبيع صارم قبل التخزين (E.164).
3. نمنع التكرار بين المستخدمين.

## Session / Refresh

بما أن جدول `UserSession` موجود أصلًا، نستخدمه بدل إنشاء جدول جديد عبر توسيعه بحقول واضحة:

1. `refreshTokenHash` (لا نخزن refresh token الخام).
2. `deviceId`.
3. `deviceLabel`.
4. `isRevoked` + `revokedAt` + `revokedReason`.
5. `rotatedFromSessionId` (اختياري لتتبع rotation chain).

## MFA (مرحلة 2)

إضافة جدول عوامل تحقق مثل `UserAuthFactor`:

1. `type` (`TOTP`, `WEBAUTHN`).
2. `secretEncrypted` لـ TOTP.
3. `isEnabled`.
4. `verifiedAt`.

## تصميم API المستهدف

## Auth Endpoints

1. `POST /auth/login`
   - input:
     - `loginId` (email أو phone)
     - `password`
     - `captchaToken?`
     - `deviceId?`
     - `deviceLabel?`
   - output:
     - إذا MFA غير مفعل: access token + user + set refresh cookie
     - إذا MFA مفعل: `mfaRequired: true` + `challengeId`

2. `POST /auth/mfa/verify` (مرحلة MFA)
   - input: `challengeId`, `code`
   - output: access token + set refresh cookie

3. `POST /auth/refresh`
   - يقرأ refresh token من HttpOnly cookie
   - يصدر access token جديد + refresh rotated cookie

4. `POST /auth/logout`
   - revoke session الحالية + clear refresh cookie

5. `GET /auth/sessions`
   - إرجاع الأجهزة والجلسات النشطة للمستخدم

6. `DELETE /auth/sessions/:sessionId`
   - إنهاء جلسة جهاز محدد

## قواعد الأمان الأساسية

1. الانتقال من `bcrypt` إلى `argon2id` للمستخدمين الجدد.
2. دعم fallback للتحقق من `bcrypt` للحسابات القديمة ثم إعادة التشفير تلقائيًا بـ Argon2 بعد نجاح الدخول.
3. عدم إرجاع سبب تفصيلي لفشل تسجيل الدخول (`Invalid credentials` فقط).
4. تسجيل audit event لمحاولات الدخول الناجحة والفاشلة.
5. Rate limit مبدئي مقترح:
   - 5 محاولات / 15 دقيقة لكل `IP + loginId`.
6. قفل مؤقت تصاعدي بعد الفشل المتكرر.
7. تفعيل حماية CORS + cookies بالشكل الملائم للبيئة.
8. تفعيل security headers (مثل Helmet) في Nest.

## تصميم تسجيل الدخول بالهاتف (مع مفتاح الدولة)

## UX

في شاشة الدخول:

1. خيار `البريد الإلكتروني`.
2. خيار `رقم الهاتف`.

عند اختيار الهاتف:

1. حقل `مفتاح الدولة` (قائمة).
2. حقل `رقم الهاتف`.
3. يتم دمجهم وتطبيعهم إلى `E.164` قبل الإرسال.

## Backend Validation

1. إذا كان `loginId` يحتوي `@` يعامل كبريد.
2. خلاف ذلك يعامل كرقم هاتف بعد التطبيع.
3. التطبيع والتحقق عبر مكتبة موثوقة مثل `libphonenumber-js`.

## خطة تنفيذ مرحلية

## Phase 0 (عاجل جدًا)

1. تغيير `JWT_SECRET` في بيئة التشغيل إلى قيمة قوية حقيقية.
2. ضبط `JWT_EXPIRES_IN` إلى مدة قصيرة (15m).
3. مراجعة أي أسرار مكشوفة في البيئة/السجلات وتدويرها.

## Phase 1: Foundation

1. تحديث Prisma schema لحقول الهاتف والجلسات.
2. إنشاء migrations.
3. تحديث DTO وAuthService ليقبل `loginId` بدل `email` فقط.
4. إضافة إصدار Refresh Token مع التخزين hash داخل `sessions`.
5. إنشاء endpoints: `refresh`, `logout`, `sessions`.

## Phase 2: Frontend Auth Refactor

1. تحديث شاشة الدخول لدعم email/phone + country code.
2. إزالة الاعتماد على `localStorage` كمرجع أساسي للجلسة.
3. الاعتماد على HttpOnly refresh cookie + access token memory flow.
4. إضافة auto-refresh قبل انتهاء access token أو عند 401.

## Phase 3: Security Hardening

1. تطبيق rate limiting لنقاط auth.
2. CAPTCHA عند فشل متكرر.
3. Device tracking + إشعار دخول جديد.
4. إعداد security headers + cookie flags حسب البيئة.

## Phase 4 (اختياري متقدم)

1. MFA عبر TOTP.
2. WebAuthn/passkeys.

## اختبار وقبول (Definition of Done)

## Backend Tests

1. login بالإيميل ناجح.
2. login بالهاتف (E.164) ناجح.
3. login خاطئ يعطي نفس رسالة الخطأ دائمًا.
4. refresh يعمل ويعمل rotation.
5. refresh token قديم بعد rotation يرفض.
6. logout يلغي session الحالية.
7. rate limit يفعّل بعد الحد.

## Frontend Tests

1. UI تبديل email/phone يعمل.
2. country code + phone يبني `loginId` صحيح.
3. انتهاء access token لا يخرج المستخدم مباشرة إذا refresh صالح.
4. فشل refresh ينفذ sign-out نظيف.

## مراقبة وتشغيل

1. Dashboard لمؤشرات:
   - نسبة فشل login
   - عدد refresh/day
   - محاولات blocked by rate limit
2. alert عند زيادة غير طبيعية في فشل الدخول.

## قرارات مقترحة جاهزة للبدء

القيم الافتراضية الموصى بها في مشروعك:

1. Access token: `15m`.
2. Refresh token: `7d`.
3. Rate limit login: `5 / 15m`.
4. CAPTCHA: بعد 3 محاولات فاشلة متتالية.
5. MFA: اختياري أولًا للمستخدمين الإداريين، ثم التعميم.

## مخرجات هذه الخطة

عند تنفيذها ستحصل على:

1. تسجيل دخول مرن (بريد أو هاتف) مع تجربة واضحة.
2. جلسات أكثر أمانًا عبر refresh rotation وdevice-bound session records.
3. تقليل كبير لمخاطر سرقة التوكن بسبب إلغاء التخزين المحلي كتخزين أساسي.
4. جاهزية ممتازة للتوسع إلى MFA وWebAuthn.

## حالة التنفيذ (تحديث 2026-04-08)

تم إنجاز فعليًا داخل الكود:

1. Phase 1 + Phase 2 + جزء كبير من Phase 3:
   - login بـ email/phone (`loginId`).
   - access token + refresh token مع cookie HttpOnly.
   - refresh rotation + logout + sessions management.
   - login/refresh rate limits + CAPTCHA gating + device tracking + new-device notifications.
2. بدء Phase 4 (MFA TOTP):
   - إضافة جداول `user_auth_factors` و `auth_mfa_challenges`.
   - إضافة endpoints:
     - `POST /auth/mfa/setup`
     - `POST /auth/mfa/enable`
     - `POST /auth/mfa/disable`
     - `POST /auth/mfa/verify`
   - تعديل `/auth/login` ليعيد `mfaRequired + challengeId` عند تفعيل MFA.
   - تحديث واجهة تسجيل الدخول لدعم خطوة إدخال كود MFA واستكمال الجلسة.

3. Phase 4 (WebAuthn / Passkeys):
   - إضافة جداول:
     - `user_webauthn_credentials`
     - `auth_webauthn_challenges`
   - إضافة endpoints:
     - `POST /auth/webauthn/registration/options`
     - `POST /auth/webauthn/registration/verify`
     - `GET /auth/webauthn/credentials`
     - `DELETE /auth/webauthn/credentials/:credentialId`
     - `POST /auth/webauthn/authentication/options`
     - `POST /auth/webauthn/authentication/verify`
   - الواجهة (Login + Profile):
     - زر "دخول بالبصمة (Passkey)" (دخول بدون كلمة مرور).
     - قسم "Passkeys" في البروفايل لإضافة/حذف البصمات.

4. الهاتف (Phone) في إدارة المستخدم والبروفايل:
   - Frontend:
     - تم إضافة حقول الهاتف (مفتاح الدولة + الرقم) في إنشاء/تعديل المستخدم.
     - تم إضافة تعديل رقم الهاتف داخل صفحة الملف الشخصي.
   - Backend:
     - الهاتف محفوظ كـ `phoneCountryCode`, `phoneNationalNumber`, و `phoneE164` (Unique).

5. جلسات الأجهزة (Device Sessions) في البروفايل:
   - `GET /auth/sessions` تعرض الجلسات النشطة مع:
     - `deviceId`, `deviceLabel`, `ipAddress`, `userAgent`, `lastActivity`, `expiresAt`, `isCurrent`.
   - `DELETE /auth/sessions/:sessionId` لإلغاء جلسة محددة.
   - Frontend:
     - تم إضافة قائمة الجلسات في صفحة الملف الشخصي + زر "إلغاء الجلسة".

6. Passkey كعامل ثانوي بعد كلمة المرور (Password + Passkey):
   - تمت إضافة حقل `users.webauthn_required`:
     - عند تفعيله: `/auth/login` بعد كلمة المرور يرجع `webauthnRequired: true` + `challengeId` + `options`.
     - ثم الواجهة تقوم بتأكيد البصمة وتستدعي `/auth/webauthn/authentication/verify` لإصدار الجلسة.
   - التفعيل/الإلغاء من الملف الشخصي عبر:
     - `PATCH /auth/profile` مع `webAuthnRequired`.

7. Bot Protection (reCAPTCHA) فعلي:
   - Backend:
     - `AUTH_RECAPTCHA_SECRET` يفعّل التحقق، وإذا كان فارغًا يتجاوز التحقق (مناسب للتطوير).
   - Frontend:
     - إذا كان `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` موجودًا: يتم إنشاء التوكن تلقائيًا (reCAPTCHA v3) وإرساله في `captchaToken`.
     - إذا لم يكن موجودًا: يبقى إدخال `captchaToken` يدويًا للاختبار.

8. HTTPS Only (تشديد الإنتاج):
   - Backend:
     - تم إضافة خيار يرفض الطلبات غير HTTPS عند:
       - `AUTH_ENFORCE_HTTPS=true` أو `NODE_ENV=production`.
     - دعم `AUTH_TRUST_PROXY=true` عند التشغيل خلف Proxy (لاحتساب `x-forwarded-proto` بشكل صحيح).

---

# دليل عملي مبسط (لغير التقني)

هذا القسم يشرح "كيف تستخدم" النظام خطوة بخطوة بدون تعقيد.

## المصطلحات بسرعة

1. `loginId`:
   - حقل واحد لتسجيل الدخول: إما بريد أو رقم هاتف.
2. `Access Token (JWT)`:
   - رمز قصير العمر يرسل مع كل طلب: `Authorization: Bearer ...`
3. `Refresh Token`:
   - موجود داخل Cookie (HttpOnly) ويُستخدم لتجديد الجلسة بدون إعادة كتابة كلمة المرور.
4. `Session`:
   - سجل في قاعدة البيانات يمثل "جلسة جهاز" (متصفح/جوال) مرتبط بالمستخدم.
5. `MFA (TOTP)`:
   - كود 6 أرقام من تطبيق مثل Google Authenticator.
6. `Passkey / WebAuthn`:
   - بصمة/FaceID/Pin مرتبطة بالجهاز والمتصفح (مفتاح آمن بدل كلمة المرور أو كعامل إضافي).

## سيناريوهات تسجيل الدخول الموجودة الآن

### A) تسجيل دخول عادي (Email/Phone + Password)
1. تدخل البريد أو الهاتف + كلمة المرور.
2. يرجع لك النظام session طبيعي (JWT) ويضبط Cookie للـ Refresh.

### B) تسجيل دخول مع MFA
1. تدخل البريد/الهاتف + كلمة المرور.
2. إذا MFA مفعّل يرجع:
   - `mfaRequired: true`
3. تدخل كود التطبيق → يتم إنشاء الجلسة.

### C) تسجيل دخول بالبصمة فقط (Passwordless)
1. تضغط "دخول بالبصمة (Passkey)".
2. المتصفح يطلب بصمة/FaceID.
3. النظام يصدر جلسة بدون كلمة مرور.

### D) كلمة مرور ثم بصمة (Passkey كعامل ثانوي)
1. تفعّل الخيار من الملف الشخصي: "تسجيل الدخول بالبصمة بعد كلمة المرور".
2. عند تسجيل الدخول بعد كلمة المرور يرجع:
   - `webauthnRequired: true`
3. تؤكد البصمة → يتم إصدار الجلسة.

---

# Endpoints (API) الموجودة الآن

ملاحظة: جميع النقاط التي تحتاج دخول تستخدم `Authorization: Bearer <accessToken>`.

## Auth

1. `POST /auth/login`
   - input: `loginId`, `password`, `deviceId?`, `deviceLabel?`, `captchaToken?`
   - output:
     - نجاح: Session (JWT)
     - أو: `mfaRequired: true ...`
     - أو: `webauthnRequired: true ...` (عند تفعيل البصمة كعامل ثانوي)

2. `POST /auth/refresh`
   - يعتمد على Refresh Cookie
   - output: Session (JWT) جديدة + Refresh Cookie جديد

3. `POST /auth/logout`
   - يلغي Refresh Token الحالي ويمسح الكوكي

4. `GET /auth/sessions`
   - يعرض الجلسات النشطة

5. `DELETE /auth/sessions/:sessionId`
   - يلغي جلسة

## MFA (TOTP)

1. `POST /auth/mfa/setup`
2. `POST /auth/mfa/enable`
3. `POST /auth/mfa/disable`
4. `POST /auth/mfa/verify`

## WebAuthn (Passkeys)

1. `POST /auth/webauthn/registration/options` (يتطلب دخول)
2. `POST /auth/webauthn/registration/verify` (يتطلب دخول)
3. `GET /auth/webauthn/credentials` (يتطلب دخول)
4. `DELETE /auth/webauthn/credentials/:credentialId` (يتطلب دخول)
5. `POST /auth/webauthn/authentication/options` (بدون دخول)
6. `POST /auth/webauthn/authentication/verify` (بدون دخول)

## Profile

1. `GET /auth/profile` (يتطلب دخول)
2. `PATCH /auth/profile` (يتطلب دخول)
   - يدعم:
     - تحديث رقم الهاتف
     - تفعيل/إلغاء `webAuthnRequired`

---

# متغيرات البيئة (Environment Variables)

## Backend (`backend/.env.example`)

1. JWT
   - `JWT_SECRET` (مهم جدًا قبل الإنتاج)
   - `JWT_ACCESS_EXPIRES_IN` (مثال: `15m`)
   - `JWT_REFRESH_EXPIRES_IN` (مثال: `7d`)

2. Cookies
   - `AUTH_REFRESH_COOKIE_NAME`
   - `AUTH_COOKIE_PATH`
   - `AUTH_COOKIE_SAMESITE` (`lax` غالبًا مناسب)
   - `AUTH_COOKIE_SECURE` (يفضل `true` في الإنتاج)

3. Phone
   - `AUTH_DEFAULT_PHONE_REGION` (مثال: `YE`)

4. Rate limit + CAPTCHA
   - `AUTH_LOGIN_MAX_FAILED_ATTEMPTS`
   - `AUTH_LOGIN_WINDOW_SECONDS`
   - `AUTH_LOGIN_LOCK_SECONDS`
   - `AUTH_CAPTCHA_AFTER_FAILED_ATTEMPTS`
   - `AUTH_RECAPTCHA_SECRET` (إذا تركته فارغ: يتجاوز التحقق)
   - `AUTH_RECAPTCHA_MIN_SCORE` (للـ v3)

5. MFA (TOTP)
   - `AUTH_MFA_CHALLENGE_TTL_SECONDS`
   - `AUTH_TOTP_ISSUER`
   - `AUTH_TOTP_ENCRYPTION_KEY`

6. WebAuthn
   - `AUTH_WEBAUTHN_RP_NAME`
   - `AUTH_WEBAUTHN_RP_ID`
   - `AUTH_WEBAUTHN_ORIGINS` (قائمة origins مفصولة بفواصل)
   - `AUTH_WEBAUTHN_CHALLENGE_TTL_SECONDS`

7. HTTPS/Proxy
   - `AUTH_TRUST_PROXY` (`true` إذا خلف nginx/cloudflare)
   - `AUTH_ENFORCE_HTTPS` (`true` في الإنتاج)

## Frontend (`frontend/.env.example`)

1. `BACKEND_API_URL`
2. `NEXT_PUBLIC_API_PROXY_PREFIX`
3. reCAPTCHA (اختياري)
   - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
   - `NEXT_PUBLIC_RECAPTCHA_ACTION` (مثال: `login`)

---

# ملاحظة مهمة (Vercel + Render + Cookies)

إذا كان الفرونت على `vercel.app` والباك على `onrender.com` ثم حاولت الوصول للباك مباشرة،
قد تواجه مشاكل في Refresh Cookie بسبب قيود بعض المتصفحات على Third‑party cookies.

الحل الأفضل الموجود في المشروع:

1. استخدم Proxy عبر Vercel rewrite:
   - الطلبات تذهب من الفرونت إلى `/backend/*` (نفس الدومين).
   - `frontend/next.config.mjs` يعيد توجيهها إلى `BACKEND_API_URL` (Render).
2. بهذه الطريقة Cookie تُضبط على دومين الفرونت (First‑party) وتعمل جلسة Refresh بشكل ثابت.

إعدادات موصى بها مع هذا الأسلوب:

1. Backend:
   - `AUTH_COOKIE_SAMESITE="lax"`
   - `AUTH_COOKIE_SECURE=true`
   - `CORS_ORIGIN="https://school-erp-platform.vercel.app"`
2. Frontend:
   - `BACKEND_API_URL="https://school-erp-platform.onrender.com"`

---

# أين أجد الكود؟ (مراجع سريعة)

## Backend
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/auth-security.service.ts`
- `backend/src/auth/auth-mfa.service.ts`
- `backend/src/auth/auth-webauthn.service.ts`
- `backend/src/auth/auth.controller.ts`
- `backend/prisma/schema.prisma`

## Frontend
- `frontend/src/features/auth/components/login-screen.tsx`
- `frontend/src/features/profile/components/profile-workspace.tsx`
- `frontend/src/lib/api/client.ts`
- `frontend/src/lib/env.ts`
