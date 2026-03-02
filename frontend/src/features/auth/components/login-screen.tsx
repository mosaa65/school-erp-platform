"use client";

import * as React from "react";
import { KeyRound, LoaderCircle, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
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
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute top-6 left-6">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <Badge variant="secondary" className="w-fit gap-1.5">
            <KeyRound className="h-4 w-4" />
            Frontend Step 02
          </Badge>
          <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
          <CardDescription>
            أدخل بيانات حسابك للوصول إلى لوحة School ERP وتجربة الـAPI المحمي.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
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
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                كلمة المرور
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                required
                minLength={8}
              />
            </div>

            {loginError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {loginError}
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              دخول
            </Button>
          </form>
        </CardContent>

        <CardFooter className="block space-y-2 border-t border-border/70 text-xs text-muted-foreground">
          <p>
            بيانات seed الافتراضية:
            <code className="mx-1 rounded bg-muted px-1 py-0.5">
              {DEFAULT_EMAIL}
            </code>
            /
            <code className="mx-1 rounded bg-muted px-1 py-0.5">
              {DEFAULT_PASSWORD}
            </code>
          </p>
          <p>
            مصدر البيانات: <code>backend/prisma/seed.ts</code>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}




