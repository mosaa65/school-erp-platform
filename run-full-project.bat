@echo off
title School ERP Auto Runner
color 0A

echo =====================================
echo   🚀 Starting School ERP Project
echo =====================================
echo.

REM =========================
REM تنظيف الكاش والمجلدات
REM =========================
echo 🧹 Cleaning cache...

if exist frontend\.next rmdir /s /q frontend\.next
if exist backend\dist rmdir /s /q backend\dist

echo ✅ Clean done
echo.

REM =========================
REM تثبيت الحزم (اختياري)
REM =========================
echo 📦 Installing dependencies...

cd backend
call npm install

cd ../frontend
call npm install

cd ..

echo ✅ Dependencies installed
echo.

REM =========================
REM Prisma
REM =========================
echo ⚙️ Running Prisma...

cd backend
call npx prisma generate

echo Running migrations...
call npx prisma migrate deploy

echo Running seeds...
call npm run prisma:seed:core
call npm run prisma:seed:demo

cd ..

echo ✅ Prisma ready
echo.

REM =========================
REM تشغيل Backend
REM =========================
echo 🟢 Starting Backend...

start cmd /k "cd backend && npm run start:dev"

timeout /t 5 > nul

REM =========================
REM تشغيل Frontend
REM =========================
echo 🔵 Starting Frontend...

start cmd /k "cd frontend && npm run dev"

timeout /t 5 > nul

REM =========================
REM فتح المتصفح
REM =========================
echo 🌐 Opening browser...

start http://localhost:3001

echo.
echo =====================================
echo ✅ Project is running successfully!
echo =====================================
echo.

pause