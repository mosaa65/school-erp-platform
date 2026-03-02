# Engineer 04 Playbook - Students and Grading

## Mission
مسؤول عن نطاق الطلاب والدرجات (مع التكامل الأكاديمي).

## Owned Backend Modules
1. `backend/src/modules/students`
2. `backend/src/modules/guardians`
3. `backend/src/modules/student-guardians`
4. `backend/src/modules/student-enrollments`
5. `backend/src/modules/student-attendance`
6. `backend/src/modules/student-books`
7. `backend/src/modules/exam-periods`
8. `backend/src/modules/exam-assessments`
9. `backend/src/modules/student-exam-scores`
10. `backend/src/modules/homework-types`
11. `backend/src/modules/homeworks`
12. `backend/src/modules/student-homeworks`
13. `backend/src/modules/academic-months`
14. `backend/src/modules/monthly-grades`
15. `backend/src/modules/monthly-custom-component-scores`
16. `backend/src/modules/semester-grades`
17. `backend/src/modules/annual-grades`
18. `backend/src/modules/annual-results`
19. `backend/src/modules/annual-statuses`
20. `backend/src/modules/promotion-decisions`
21. `backend/src/modules/grading-policies`
22. `backend/src/modules/grading-outcome-rules`

## Owned Frontend Areas
المرحلة الحالية frontend يغطي جزءا محددا، لذلك Engineer 04 ينسق لإضافة واجهات students/grading تدريجيا حسب الأولوية المعتمدة.

## Core Responsibilities
1. integrity of student lifecycle.
2. grading computations consistency.
3. cross-check impacts on reports/certificates flows.

## Branch Pattern
`feature/SYS04-SYS05-<short-description>-eng04`

## Mandatory Commands
```bash
cd backend
npm run lint
npm run build
npm run test:e2e
```

إذا كان هناك frontend changes:
```bash
cd frontend
npm run lint
npm run typecheck
npm run e2e
```

## Change Report Required When
1. أي grading policy تغير.
2. أي calculation logic تغير.
3. أي table relation بين students and grades تتغير.
4. أي تأثير على academic core endpoints.

## Do Not Do
1. لا تنشر calculation change بدون test evidence واضح.
2. لا تغير schema حساسة بدون rollback plan.
