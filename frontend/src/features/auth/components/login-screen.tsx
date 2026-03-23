"use client";

import * as React from "react";
import { KeyRound, LoaderCircle, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLoginMutation } from "@/features/auth/hooks/use-login-mutation";
import { useAuth } from "@/features/auth/providers/auth-provider";

const DEFAULT_EMAIL = "admin@school.local";
const DEFAULT_PASSWORD = "ChangeMe123!";

function sanitizeNextPath(nextPath: string | null): string {
  if (!nextPath) {
    return "/app";
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/app";
  }

  return nextPath;
}

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const loginMutation = useLoginMutation();
  const nextPath = sanitizeNextPath(searchParams.get("next"));

  const [email, setEmail] = React.useState(DEFAULT_EMAIL);
  const [password, setPassword] = React.useState(DEFAULT_PASSWORD);

  React.useEffect(() => {
    if (auth.isHydrated && auth.isAuthenticated) {
      router.replace(nextPath);
    }
  }, [auth.isAuthenticated, auth.isHydrated, nextPath, router]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: () => {
          router.replace(nextPath);
        },
      },
    );
  };

  const loginError =
    loginMutation.error instanceof Error
      ? loginMutation.error.message
      : undefined;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50/50 dark:bg-slate-950 px-4 py-10">
      {/* Subtle Pastel Mesh Gradients matching the screenshot exactly */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[500px] w-[500px] rounded-full bg-teal-100/50 dark:bg-teal-900/20 blur-[100px]" />
        <div className="absolute -top-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-orange-100/40 dark:bg-orange-900/20 blur-[100px]" />
        <div className="absolute bottom-[20%] right-[-10%] h-[400px] w-[400px] rounded-full bg-yellow-50/50 dark:bg-yellow-900/10 blur-[100px]" />
      </div>



      <Card className="relative z-10 w-full max-w-[420px] rounded-2xl border-border/50 bg-white/95 dark:bg-card/95 shadow-[0_2px_20px_-10px_rgba(0,0,0,0.05)] backdrop-blur-sm">
        <CardHeader className="space-y-4 pt-8 pb-5 text-center flex flex-col items-center">
          <Badge variant="secondary" className="gap-1.5 rounded-full px-3 py-1 font-normal text-xs bg-muted/60 text-foreground shadow-none hover:bg-muted/80">
            Frontend Step 02
            <KeyRound className="h-3.5 w-3.5" />
          </Badge>
          <div className="space-y-2 flex flex-col items-center">
            <CardTitle className="text-[26px] font-bold tracking-tight">تسجيل الدخول</CardTitle>
            <CardDescription className="text-sm font-medium leading-relaxed px-2 text-center text-muted-foreground">
              أدخل بيانات حسابك للوصول إلى لوحة School ERP وتجربة الـAPI المحمي.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-2">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2.5 text-right w-full">
              <label htmlFor="email" className="text-sm font-bold text-foreground/90 block">
                البريد الإلكتروني
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@school.local"
                required
                className="h-11 rounded-lg font-medium text-right direction-rtl placeholder:text-muted-foreground/60 w-full focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 transition-colors"
                dir="rtl"
              />
            </div>

            <div className="space-y-2.5 text-right w-full">
              <label htmlFor="password" className="text-sm font-bold text-foreground/90 block">
                كلمة المرور
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="h-11 rounded-lg tracking-[0.2em] font-medium text-right direction-rtl placeholder:text-muted-foreground/60 w-full focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 transition-colors"
                dir="rtl"
              />
            </div>

            {loginError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive text-center">
                {loginError}
              </div>
            ) : null}

            <div className="pt-2 w-full">
              <Button
                type="submit"
                className="w-full h-11 gap-2 rounded-lg font-bold shadow-none tracking-wide hover:shadow-lg transition-all duration-300"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4 scale-x-[-1]" />
                )}
                دخول
              </Button>
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2.5 border-t border-border/40 px-8 py-5 text-center text-xs font-medium text-muted-foreground">
          <p className="flex items-center justify-center flex-wrap gap-x-1 gap-y-2 leading-relaxed">
            بيانات seed الافتراضية:
            <code className="rounded bg-muted/60 px-1.5 py-0.5 text-foreground/80 mx-0.5 font-mono">{DEFAULT_EMAIL}</code>/
            <code className="rounded bg-muted/60 px-1.5 py-0.5 text-foreground/80 mx-0.5 font-mono">{DEFAULT_PASSWORD}</code>
          </p>
          <p>
            مصدر البيانات: <code className="text-foreground/80 font-mono">backend/prisma/seed.ts</code>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
