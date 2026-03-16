# Engineer 02 Playbook - Academic and Scheduling

## Mission
مسؤول عن النواة الأكاديمية والجدول الأكاديمي.

## Owned Backend Modules
1. `backend/src/modules/academic-years`
2. `backend/src/modules/academic-terms`
3. `backend/src/modules/grade-levels`
4. `backend/src/modules/sections`
5. `backend/src/modules/subjects`
6. `backend/src/modules/grade-level-subjects`
7. `backend/src/modules/term-subject-offerings`
8. `backend/src/modules/timetable-entries`

## Owned Frontend Areas
1. `frontend/src/app/app/academic-years`
2. `frontend/src/app/app/academic-terms`
3. `frontend/src/app/app/grade-levels`
4. `frontend/src/app/app/sections`
5. `frontend/src/app/app/subjects`
6. `frontend/src/app/app/grade-level-subjects`
7. `frontend/src/app/app/term-subject-offerings`
8. `frontend/src/app/app/timetable-entries`

## Core Responsibilities
1. استقرار academic contracts.
2. منع تضارب business rules بين term/section/offering/timetable.
3. تحسين فلاتر/pagination للأكاديمي.

## Branch Pattern
`feature/SYS02-<short-description>-eng02`

## Mandatory Commands
```bash
cd backend
npm run lint
npm run build

cd ../frontend
npm run lint
npm run typecheck
```

## Change Report Required When
1. تغيير models للأكاديمي.
2. أي endpoint يستخدمه HR/Students downstream.
3. أي migration تمس بنية year/term/section.

## Do Not Do
1. لا تعدل shared auth/rbac without Engineer 01 review.
2. لا تضيف breaking API without coordination with frontend consumers.
