# خطة توحيد واجهات الدخول والهاتف الدولي وإعادة الاستخدام

Date: 2026-04-09

## الهدف

هذه الخطة توحّد ثلاث مشاكل مترابطة في النظام ضمن تنفيذ واحد قابل لإعادة الاستخدام:

1. إعادة تصميم واجهة تسجيل الدخول لتصبح أنيقة، متناسقة مع هوية النظام، وملونة بنفس اللغة البصرية الحالية.
2. جعل تسجيل الدخول الافتراضي عبر `رقم الهاتف + مفتاح الدولة` بدل البريد الإلكتروني، مع الإبقاء على البريد كخيار ثانوي.
3. بناء مكوّن هاتف دولي موحّد reusable يستخدم مرة واحدة في الكود ثم يُعاد استعماله في:
   - شاشة تسجيل الدخول
   - إنشاء/تعديل المستخدم
   - بيانات ولي الأمر
   - بيانات الموظف
   - أي شاشة مستقبلية تتعامل مع رقم هاتف

الهدف النهائي ليس مجرد تحسين شكل الواجهة، بل تأسيس بنية UI وValidation وData Mapping واحدة ومحمية وقابلة للتوسع.

## الملخص التنفيذي

التوصية الأساسية:

1. عدم معالجة شاشة الدخول وحدها بشكل منفصل.
2. عدم الاكتفاء بتوسيع الـ `select` الحالي الخاص بمفتاح الدولة.
3. تنفيذ طبقة مشتركة جديدة باسم عمل مبدئي:
   - `InternationalPhoneField`
   - `CountryDialCodePicker`
   - `AuthIdentityField`

هذه الطبقة ستصبح المصدر الوحيد لاختيار الدولة وتنسيق الهاتف وعرض العلم والبحث والتحقق والدمج بين:

1. `country`
2. `dialCode`
3. `nationalNumber`
4. `e164`

وبعدها يتم إعادة تركيب:

1. `login-screen`
2. `users-management-workspace`
3. `guardians-workspace`
4. `employees-workspace`

فوق نفس المكوّن بدل تكرار منطق الهاتف في كل شاشة.

## الوضع الحالي في المشروع

## 1. تسجيل الدخول

الحالة الحالية في [frontend/src/features/auth/components/login-screen.tsx](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/frontend/src/features/auth/components/login-screen.tsx):

1. شاشة الدخول تستخدم تبديل بين `email` و `phone`.
2. الوضع الافتراضي الحالي هو `email`.
3. قائمة الدولة الحالية ثابتة وصغيرة جدًا.
4. إدخال مفتاح الدولة يتم عبر `select` تقليدي بدون:
   - بحث
   - علم الدولة
   - قائمة كاملة
   - عرض منسق
5. زر البصمة الحالي منفصل أسفل النموذج كزر مستقل نصي.
6. حقل كلمة المرور لا يحتوي أيقونة بصمة مدمجة داخله.

## 2. إدارة المستخدمين

الحالة الحالية في [frontend/src/features/users/components/users-management-workspace.tsx](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/frontend/src/features/users/components/users-management-workspace.tsx):

1. مفتاح الدولة ورقم الهاتف حقلان يدويان بسيطان.
2. لا يوجد اختيار دول كامل.
3. لا يوجد توحيد مع شاشة الدخول.
4. لا يوجد Mapper موحد للهاتف.

## 3. أولياء الأمور والموظفون

الحالة الحالية في:

- [frontend/src/features/guardians/components/guardians-workspace.tsx](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/frontend/src/features/guardians/components/guardians-workspace.tsx)
- [frontend/src/features/employees/components/employees-workspace.tsx](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/frontend/src/features/employees/components/employees-workspace.tsx)

1. النظام يستخدم `PhoneContactInput`.
2. هذا المكوّن جيد كفكرة لاختيار رقم من الجهاز، لكنه ليس International Phone Field.
3. الحقول الحالية تعتمد رقمًا نصيًا خامًا.
4. لا يوجد فصل بين:
   - الدولة
   - مفتاح الدولة
   - الرقم المحلي
5. لا يوجد سلوك موحّد بين هذه الشاشات وشاشة المستخدمين وشاشة الدخول.

## المتطلبات المستخلصة من الطلب

## 0. متطلبات بيانات المدير والسرية

1. يجب ألا تظهر بيانات تسجيل الدخول الافتراضية للمدير داخل شاشة تسجيل الدخول.
2. يجب ألا يقوم seed بطباعة بريد المدير أو كلمة المرور أو أي بيانات دخول حساسة في الـ terminal.
3. يجب اعتماد ملف مدير افتراضي جديد بدل القيم القديمة.
4. يجب أن تكون كلمة المرور قوية جدًا ويتم التعامل معها كسر تشغيلي وليس كنص عرض داخل الواجهة.

البيانات المطلوبة:

1. البريد الإلكتروني: `mousa.mc13@gmail.com`
2. اسم المستخدم: `eng_mousa`
3. مفتاح الدولة: `+967`
4. رقم الهاتف: `772217218`
5. الاسم الأول: `موسئ`
6. الاسم الأخير: `العواضي`
7. كلمة المرور المقترحة: `M0usa!Awdi#2026$Secure`

## 1. متطلبات تصميم شاشة الدخول

1. واجهة أنيقة وتشبه بقية النظام.
2. ألوان وهوية بصرية متناسقة مع التطبيق الحالي.
3. جعل الهاتف هو طريقة الدخول الافتراضية.
4. إبقاء خيار البريد الإلكتروني كخيار ثانوي.
5. وضع أيقونة البصمة فقط داخل حقل كلمة المرور.
6. موضع أيقونة البصمة:
   - داخل حقل كلمة المرور
   - في الجهة اليسرى من الحقل
7. تقليل النصوص الزائدة المتعلقة بالبصمة واستبدالها بعنصر بصري أنظف.

## 2. متطلبات اختيار الدولة والهاتف

1. قائمة كاملة بكل الدول.
2. كل عنصر في القائمة يعرض:
   - علم الدولة
   - اسم الدولة
   - مفتاح الدولة
3. وجود بحث داخل القائمة.
4. دعم استخدام لوحة المفاتيح.
5. عرض المفتاح والرقم في صف واحد.
6. في حقول الإدخال:
   - مفتاح الدولة على اليسار
   - الرقم على اليمين
7. نفس السلوك في:
   - تسجيل الدخول
   - إنشاء مستخدم
   - تعديل مستخدم
   - إضافة هاتف ولي أمر
   - إضافة هاتف موظف

## 3. متطلبات هندسية

1. الكود يكتب مرة واحدة ويعاد استخدامه.
2. التحقق Validation يكون موحدًا.
3. التطبيع Normalization يكون موحدًا.
4. التمثيل البصري موحد.
5. الأمن والقيود والرسائل موحدة.
6. قابلية التوسع لاحقًا إلى:
   - واتساب
   - هاتف احتياطي
   - تفضيل دولة افتراضية حسب الفرع أو المستخدم
7. إزالة أي عرض صريح لبيانات seed أو بيانات الإدارة من الـ UI أو من الرسائل التشغيلية الاعتيادية.

## الرؤية المستهدفة

## 1. مكوّنات مشتركة جديدة

### A. `CountryDialCodePicker`

مكوّن مسؤول عن:

1. عرض قائمة الدول.
2. البحث بالاسم أو ISO code أو dial code.
3. عرض العلم.
4. إرجاع كائن موحد مثل:

```ts
type CountryDialCodeOption = {
  iso2: string;
  nameAr: string;
  nameEn: string;
  flag: string;
  dialCode: string;
  priority?: number;
};
```

### B. `InternationalPhoneField`

مكوّن مركب مسؤول عن:

1. اختيار الدولة من `CountryDialCodePicker`.
2. إدخال الرقم المحلي.
3. بناء القيمة المعيارية.
4. دعم `controlled/uncontrolled`.
5. دعم read-only وdisabled.
6. دعم layout أفقي موحد.
7. إرجاع بيانات منظمة بدل string خام.

شكل المخرجات المقترح:

```ts
type InternationalPhoneValue = {
  countryIso2: string;
  dialCode: string;
  nationalNumber: string;
  e164: string;
  isValid: boolean;
};
```

### C. `PasswordFieldWithBiometricAction`

مكوّن مسؤول عن:

1. عرض حقل كلمة المرور.
2. دعم إظهار/إخفاء كلمة المرور.
3. عرض أيقونة البصمة فقط داخل الحقل من اليسار.
4. تشغيل passkey flow عند الضغط على الأيقونة إذا كان متاحًا.
5. إخفاء الأيقونة أو تعطيلها عندما لا تكون البصمة متاحة.

### D. `AuthIdentityField`

مكوّن أعلى مستوى خاص بشاشة الدخول:

1. يبدّل بين `phone` و `email`.
2. يبدأ افتراضيًا على `phone`.
3. عند `phone` يستخدم `InternationalPhoneField`.
4. عند `email` يستخدم `Input`.
5. يُرجع `loginId` جاهزًا للارسال.

## 2. مصدر بيانات الدول

التوصية:

1. استخدام مصدر بيانات محلي ثابت داخل الفرونت وليس API خارجي وقت التشغيل.
2. إنشاء ملف بيانات داخلي مثل:
   - `frontend/src/lib/intl/country-dial-code-data.ts`
3. يحتوي:
   - كل الدول
   - اسم عربي
   - اسم إنجليزي
   - ISO2
   - Dial code
   - Flag emoji أو fallback icon

الأسباب:

1. سرعة أعلى.
2. لا اعتماد خارجي.
3. سهولة الاختبار.
4. سهولة إعادة الاستخدام في كل النماذج.

## 3. سياسة التصميم البصري

## شاشة الدخول

يجب أن تلتزم الشاشة بلغة النظام بدل إنتاج شاشة معزولة شكليًا:

1. استخدام نفس palette السائدة في النظام.
2. الحفاظ على الخلفية المتدرجة والطبقات الضوئية لكن بصياغة أنضج.
3. تحويل بطاقة الدخول إلى كتلة أوضح بصريًا مع:
   - hero مختصر
   - subtitle أكثر دقة
   - spacing أفضل
4. جعل الـ segmented control الخاص بطريقة الدخول أكثر وضوحًا.
5. جعل الهاتف هو الـ primary flow ظاهرًا أولًا.
6. إزالة الإحساس التجريبي الموجود حاليًا مثل:
   - `Frontend Step 02`
   - بيانات seed المعروضة دائمًا للمستخدم النهائي
7. منع ظهور أي بريد أو كلمة مرور خاصة بالإدارة في footer أو help text أو banners داخل صفحة الدخول.

## البصمة

التصميم المستهدف:

1. لا يوجد زر نصي كبير مستقل باسم "دخول بالبصمة" داخل النموذج الأساسي.
2. توجد أيقونة بصمة فقط داخل حقل كلمة المرور من اليسار.
3. الضغط عليها ينفذ:
   - passkey login إذا كان هذا المسار متاحًا
   - أو password + passkey verification إذا كان الحساب يتطلب ذلك
4. tooltip مختصر عند hover أو long press:
   - `الدخول بالبصمة`

## سياسة إعادة الاستخدام

## قاعدة أساسية

أي مكان يلتقط رقم هاتف في الواجهة يجب ألا يبني حقوله بنفسه.

القاعدة الجديدة:

1. يمنع استخدام:
   - `Input` منفصل لمفتاح الدولة
   - `select` محلي لكل شاشة
   - بناء `+967...` يدويًا داخل كل form
2. يجب أن يعتمد الجميع على:
   - `InternationalPhoneField`

## الاستخدامات الأولى المستهدفة

1. [frontend/src/features/auth/components/login-screen.tsx](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/frontend/src/features/auth/components/login-screen.tsx)
2. [frontend/src/features/users/components/users-management-workspace.tsx](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/frontend/src/features/users/components/users-management-workspace.tsx)
3. [frontend/src/features/guardians/components/guardians-workspace.tsx](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/frontend/src/features/guardians/components/guardians-workspace.tsx)
4. [frontend/src/features/employees/components/employees-workspace.tsx](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/frontend/src/features/employees/components/employees-workspace.tsx)
5. [frontend/src/features/profile/components/profile-workspace.tsx](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/frontend/src/features/profile/components/profile-workspace.tsx)

## علاقة المكوّن الجديد بـ `PhoneContactInput`

لا يتم حذف [frontend/src/components/ui/phone-contact-input.tsx](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/frontend/src/components/ui/phone-contact-input.tsx)، بل يعاد تموضعه.

الخطة المقترحة:

1. `PhoneContactInput` يبقى كميزة مساعدة لاختيار رقم من الجهاز.
2. يتم دمجه اختياريًا داخل `InternationalPhoneField` عبر prop مثل:

```ts
enableContactPicker?: boolean;
```

3. في شاشات ولي الأمر والموظف يمكن تفعيل زر اختيار رقم من الجهاز.
4. في شاشة الدخول وإنشاء المستخدم غالبًا يكون معطلًا.

بهذا نحافظ على الشغل المنجز وننقله إلى طبقة صحيحة.

## التحقق والـ Validation

## Frontend Validation

يجب توحيد جميع قواعد الهاتف في util واحدة مثل:

- `frontend/src/lib/intl/phone.ts`

وتشمل:

1. تنظيف الرقم من المسافات والرموز غير المسموحة.
2. بناء `e164`.
3. التحقق من صحة الرقم عبر `libphonenumber-js`.
4. استخراج رسائل خطأ عربية موحدة.

واجهات مقترحة:

```ts
type NormalizedPhoneResult =
  | {
      ok: true;
      countryIso2: string;
      dialCode: string;
      nationalNumber: string;
      e164: string;
    }
  | {
      ok: false;
      code:
        | "missing_country"
        | "missing_number"
        | "invalid_number"
        | "unsupported_country";
      message: string;
    };
```

## Backend Validation

رغم أن الباك حاليًا يطبع الهاتف، يجب أن تبقى القاعدة:

1. الفرونت يتحقق مبكرًا لتحسين UX.
2. الباك يتحقق نهائيًا لحماية البيانات.
3. لا يعتمد الباك على أن الفرونت أرسل شيئًا صحيحًا دائمًا.

## حالات خاصة يجب تغطيتها

1. مفتاح دولة موجود والرقم فارغ.
2. رقم موجود ومفتاح الدولة فارغ.
3. إدخال أصفار بادئة غير صحيحة.
4. نسخ رقم كامل يتضمن `+`.
5. تغيير الدولة بعد إدخال الرقم.
6. أرقام جوال قصيرة أو غير صالحة.
7. استيراد رقم من Contact Picker يحتاج split أو normalization.

## الأمان

## شاشة الدخول

هذه الخطة تبني على خطة المصادقة السابقة في [20_AUTH_LOGIN_SECURITY_PLAN_2026-04-08.md](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/docs/plans/20_AUTH_LOGIN_SECURITY_PLAN_2026-04-08.md) ولا تستبدلها.

الإضافات المطلوبة هنا:

1. عدم كشف تفاصيل validation الحساسة في رسائل الـ auth.
2. إظهار رسائل هاتف واضحة قبل الإرسال فقط عندما يكون الخطأ محليًا في الحقول.
3. عند فشل السيرفر تبقى الرسالة عامة.
4. أيقونة البصمة لا يجب أن تتجاوز قواعد التحقق القائمة:
   - MFA
   - WebAuthn
   - Session creation
5. لا يتم تشغيل passkey flow تلقائيًا بدون تفاعل مستخدم واضح.
6. يمنع تضمين أي بيانات مدير افتراضية داخل الـ frontend bundle كنصوص معروضة للمستخدم.

## الحقول الإدارية

في إنشاء المستخدم وبيانات الموظف وولي الأمر:

1. يجب حفظ `country code` و `national number` بشكل منفصل عندما يكون ذلك مدعومًا من الـ API.
2. في الشاشات التي ما زالت تعتمد حقلًا واحدًا خامًا:
   - يستخدم المكوّن unified output
   - ثم يتم mapping إلى الصيغة المطلوبة مؤقتًا
3. يجب منع تكرار منطق parsing داخل كل workspace.

## الهيكلية المقترحة للملفات

## بيانات ودوال مشتركة

1. `frontend/src/lib/intl/country-dial-code-data.ts`
2. `frontend/src/lib/intl/phone.ts`
3. `frontend/src/lib/intl/country-search.ts`

## مكوّنات واجهة مشتركة

1. `frontend/src/components/ui/country-dial-code-picker.tsx`
2. `frontend/src/components/ui/international-phone-field.tsx`
3. `frontend/src/components/ui/password-field-with-biometric-action.tsx`
4. `frontend/src/features/auth/components/auth-identity-field.tsx`

## تكامل واستخدام

1. تحديث [frontend/src/features/auth/components/login-screen.tsx](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/frontend/src/features/auth/components/login-screen.tsx)
2. تحديث [frontend/src/features/users/components/users-management-workspace.tsx](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/frontend/src/features/users/components/users-management-workspace.tsx)
3. تحديث [frontend/src/features/guardians/components/guardians-workspace.tsx](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/frontend/src/features/guardians/components/guardians-workspace.tsx)
4. تحديث [frontend/src/features/employees/components/employees-workspace.tsx](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/frontend/src/features/employees/components/employees-workspace.tsx)
5. تحديث [frontend/src/features/profile/components/profile-workspace.tsx](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/frontend/src/features/profile/components/profile-workspace.tsx)

## تغييرات مطلوبة في الـ Seed وBootstrap

## الهدف

نقل seed admin من سلوك "bootstrap مع مخرجات مرئية" إلى سلوك "bootstrap آمن وصامت".

## التعديلات المطلوبة

1. تحديث البريد الافتراضي للمدير إلى `mousa.mc13@gmail.com`.
2. تحديث اسم المستخدم إلى `eng_mousa`.
3. تحديث الهاتف إلى:
   - `phoneCountryCode = +967`
   - `phoneNationalNumber = 772217218`
   - `phoneE164 = +967772217218`
4. تحديث الاسم:
   - `firstName = موسئ`
   - `lastName = العواضي`
5. تحديث كلمة المرور الافتراضية إلى:
   - `M0usa!Awdi#2026$Secure`
6. حذف أي `console.log` يطبع:
   - Admin email
   - Admin password
   - Seed credentials
7. استبدالها برسالة تشغيل آمنة مثل:
   - `Core seed completed successfully.`
8. إذا احتاج الفريق لاحقًا لتشغيل seed مع كشف البيانات لأغراض التطوير، يكون ذلك خلف flag صريح وغير مفعل افتراضيًا مثل:
   - `SEED_VERBOSE_CREDENTIALS=false`

## أماكن التنفيذ المرجعية

1. [backend/prisma/seed.ts](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/backend/prisma/seed.ts)
2. [backend/prisma/seeds/core/shared/admin.seed.ts](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/backend/prisma/seeds/core/shared/admin.seed.ts)
3. [backend/.env](/c:/Users/mousa/Desktop/New%20folder/backend-frontend/backend/.env)

## سياسة عدم الإظهار داخل واجهة الدخول

المطلوب صراحة:

1. إزالة footer الذي يعرض بيانات seed الافتراضية من شاشة الدخول.
2. منع استخدام أي constants مثل:
   - `DEFAULT_EMAIL`
   - `DEFAULT_PASSWORD`
   إذا كانت مخصصة لعرض بيانات مدير حقيقية داخل الـ UI.
3. إن احتاجت الشاشة قيمًا أولية أثناء التطوير:
   - تبقى فارغة افتراضيًا
   - أو تكون داخل أدوات تطوير داخلية غير ظاهرة للمستخدم النهائي

## خطة التنفيذ المرحلية

## Phase 1: Foundation

الهدف: إنشاء المصدر المشترك للبيانات والمنطق.

1. إنشاء dataset كامل للدول.
2. إنشاء util للبحث والتطبيع.
3. إنشاء API محلي موحد للتعامل مع الهاتف.
4. كتابة اختبارات وحدة لوظائف التطبيع.

Definition of Done:

1. أي شاشة تستطيع استدعاء util موحد للهاتف.
2. الدول قابلة للبحث والفرز.
3. يوجد دعم للعربية والإنجليزية في أسماء الدول.

## Phase 2: Shared UI Primitives

الهدف: بناء المكوّنات المشتركة دون ربطها بعد بكل الشاشات.

1. بناء `CountryDialCodePicker`.
2. بناء `InternationalPhoneField`.
3. بناء `PasswordFieldWithBiometricAction`.
4. دعم keyboard navigation وempty states وloading states.

Definition of Done:

1. المكوّن يعرض العلم والاسم والمفتاح.
2. البحث يعمل.
3. اختيار الدولة يحدث قيمة الهاتف.
4. الحقل يعمل جيدًا على الجوال والدسكتوب.

## Phase 3: Login UX Refactor

الهدف: ترقية شاشة الدخول لتصبح المسار المرجعي الأول.

1. جعل طريقة الدخول الافتراضية `phone`.
2. استبدال قائمة الدولة القديمة بالمكوّن الجديد.
3. إعادة تنظيم layout شاشة الدخول.
4. إدخال `PasswordFieldWithBiometricAction`.
5. جعل البصمة أيقونة داخل حقل كلمة المرور من اليسار.
6. إزالة العناصر التجريبية أو غير النهائية.
7. الحفاظ على كل منطق الـ auth الحالي بدون كسر.
8. إزالة أي معلومات دخول افتراضية معروضة من واجهة الدخول نهائيًا.

Definition of Done:

1. المستخدم يرى الهاتف أولًا.
2. يمكنه البحث عن أي دولة.
3. يمكنه تسجيل الدخول بالهاتف بسلاسة.
4. البصمة تظهر كأيقونة فقط داخل الحقل.
5. الشاشة تبدو جزءًا طبيعيًا من النظام وليست صفحة منفصلة بصريًا.
6. لا تظهر أي بيانات مدير أو seed credentials في واجهة الدخول.

## Phase 4: Admin and Master Data Rollout

الهدف: تعميم المكوّن على النماذج الإدارية.

1. تحديث نموذج المستخدم.
2. تحديث الملف الشخصي.
3. تحديث ولي الأمر.
4. تحديث الموظف.
5. دمج Contact Picker حيث يلزم.

Definition of Done:

1. كل النماذج تعتمد المكوّن نفسه.
2. اختفى تكرار حقول الدولة/الهاتف اليدوية.
3. نفس validation يظهر في كل مكان.

## Phase 5: Cleanup and Hardening

الهدف: تثبيت الحل نهائيًا.

1. حذف أو تقليل الأكواد القديمة غير المستخدمة.
2. توحيد الرسائل النصية.
3. توحيد props patterns.
4. تغطية E2E للمسارات الأساسية.
5. إزالة طباعة بيانات الاعتماد الحساسة من terminal output في مسارات seed.

Definition of Done:

1. لا توجد مصادر متنافسة لمنطق الهاتف.
2. لا توجد شاشات تستخدم أسلوبًا قديمًا متعارضًا.
3. لا توجد بيانات مدير ظاهرة في الـ UI أو في مخرجات seed العادية.

## قرار مهم بخصوص API والبيانات

هناك نوعان من حقول الهاتف في النظام حاليًا:

1. `users`
   - يدعم:
     - `phoneCountryCode`
     - `phoneNationalNumber`
     - `phoneE164`
2. `guardians/employees`
   - ما زالت بعض الحقول فيها نصية خام مثل:
     - `phonePrimary`
     - `phoneSecondary`
     - `whatsappNumber`

التوصية:

1. في هذه الدفعة، نوحد الـ UI والـ normalization أولًا.
2. نسمح مؤقتًا بعمل mapping للمخرجات إلى النص الخام في الشاشات القديمة.
3. نفتح بعد ذلك خطة data-model لاحقة إن أردنا جعل جميع هواتف النظام structured بالكامل.

هذا يمنع توسيع نطاق العمل أكثر من اللازم في نفس الدفعة.

## المخاطر

## 1. تضخم النطاق

الخطر:

إذا حاولنا في نفس الدفعة تغيير:

1. كل UI
2. كل Models
3. كل APIs
4. كل الاختبارات

فقد تصبح المهمة كبيرة جدًا.

المعالجة:

1. نبدأ بالطبقة المشتركة وواجهة الدخول أولًا.
2. ثم نعمم على الشاشات الأخرى.

## 2. أداء قائمة الدول

الخطر:

قائمة طويلة قد تصبح ثقيلة إذا بُنيت بشكل غير مناسب.

المعالجة:

1. dataset محلي خفيف.
2. بحث سريع memoized.
3. عدد DOM items مضبوط.
4. إمكانية virtualization لاحقًا إذا لزم.

## 3. تعارض RTL/LTR

الخطر:

رقم الهاتف ومفاتيح الدول واسم الدولة قد يحدث بينها ارتباك بصري.

المعالجة:

1. جعل صف الهاتف mixed-direction بعناية.
2. إبقاء الرقم `ltr`.
3. إبقاء labels العامة عربية `rtl`.
4. تثبيت موضع dial code على اليسار.

## معايير القبول

## تصميم

1. شاشة الدخول أجمل وأوضح ومتناسقة مع النظام.
2. الهاتف هو الخيار الافتراضي.
3. البصمة تظهر كأيقونة فقط داخل حقل كلمة المرور.

## تجربة استخدام

1. المستخدم يستطيع البحث عن أي دولة.
2. يرى العلم والاسم والمفتاح داخل القائمة.
3. الهاتف والمفتاح يظهران في صف واحد.
4. نفس التجربة متوفرة في المستخدم وولي الأمر والموظف.

## هندسة

1. لا يوجد تكرار لمنطق الهاتف عبر الشاشات.
2. يوجد util واحد للتطبيع والتحقق.
3. يوجد picker واحد للدول.
4. يوجد phone field واحد قابل لإعادة الاستخدام.

## أمان

1. لا كسر لمسارات login الحالية.
2. لا تعارض مع MFA أو WebAuthn.
3. التحقق النهائي يبقى في الباك.

## اختبارات مطلوبة

## Unit Tests

1. بناء `e164` من dial code + national number.
2. رفض المدخلات الناقصة.
3. تبديل الدولة يحدث normalization الصحيح.
4. البحث في الدول يعمل بالاسم والمفتاح.

## Component Tests

1. `CountryDialCodePicker` يفتح ويبحث ويختار.
2. `InternationalPhoneField` يعرض القيمة الصحيحة.
3. `PasswordFieldWithBiometricAction` يشغل callback البصمة.

## E2E

1. تسجيل الدخول بالهاتف.
2. تغيير طريقة الدخول إلى البريد.
3. إنشاء مستخدم مع اختيار دولة وبناء هاتف صحيح.
4. إضافة هاتف ولي أمر.
5. إضافة هاتف موظف.
6. التأكد أن شاشة الدخول لا تعرض أي بيانات seed أو بيانات مدير.

## Seed/Boot Tests

1. تشغيل seed لا يطبع كلمة المرور.
2. تشغيل seed لا يطبع البريد الإداري.
3. التحقق أن المدير الافتراضي أُنشئ بالقيم الجديدة المطلوبة.

## ترتيب التنفيذ المقترح

1. إنشاء dataset ومنطق الهاتف المشترك.
2. إنشاء picker والمكوّنات المشتركة.
3. ترقية شاشة الدخول.
4. تعميم الحقل على المستخدمين.
5. تعميمه على أولياء الأمور والموظفين.
6. إكمال الاختبارات والتنظيف.

## قرار التنفيذ الموصى به

هذه الخطة يجب اعتمادها كخطة توحيد UX + Phone Architecture، وليس كتعديل تجميلي منفصل.

السبب:

1. طلبك يشمل أكثر من شاشة.
2. المشكلة الحالية بنيوية وليست شكلية فقط.
3. أفضل نتيجة هنا تأتي من مكوّن reusable واحد.
4. هذا يقلل الأخطاء، يرفع الأمان، ويسهّل أي توسعات لاحقة.

## المخرجات المتوقعة بعد التنفيذ

1. شاشة دخول احترافية، متناسقة، وتركّز على الهاتف كمسار أساسي.
2. قائمة دول كاملة مع أعلام وبحث.
3. مكوّن هاتف دولي موحد عبر النظام.
4. كود أقل تكرارًا وأسهل صيانة.
5. Validation موحد وأوضح.
6. تكامل أنظف مع البصمة وPasskeys.

## الخطوة التالية المقترحة

بعد اعتماد هذه الخطة، تكون أول دفعة تنفيذ عملية كالتالي:

1. `country-dial-code-data.ts`
2. `phone.ts`
3. `country-dial-code-picker.tsx`
4. `international-phone-field.tsx`
5. تحديث `login-screen.tsx`

ثم نراجع النتيجة بصريًا ووظيفيًا قبل التعميم على بقية النماذج.
