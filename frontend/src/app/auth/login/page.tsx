import { Suspense } from "react";
import { LoginScreen } from "@/features/auth/components/login-screen";

function LoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <p className="text-sm text-muted-foreground">جارٍ تجهيز صفحة الدخول...</p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginScreen />
    </Suspense>
  );
}




