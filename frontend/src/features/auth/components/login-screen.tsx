"use client";

import * as React from "react";
import { LoaderCircle, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background selection:bg-primary/30">
      {/* Premium Background Effects */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="absolute top-[-10%] right-[-5%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-600/10 dark:bg-blue-900/20 blur-[150px] mix-blend-screen animate-pulse duration-[10000ms]" />
      </div>

      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="absolute top-6 left-6 z-50">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="group relative overflow-hidden rounded-[2.5rem] border border-border/40 bg-background/60 p-8 shadow-2xl backdrop-blur-2xl transition-all duration-500 hover:border-primary/30 hover:shadow-primary/10">
          
          <div className="relative space-y-6">
            <div className="flex flex-col items-center space-y-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-white/20 mb-2">
                <ShieldCheck className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">مرحباً بك مجدداً</h1>
                <p className="text-sm text-muted-foreground">
                  أدخل بيانات حسابك للولوج إلى النظام التعليمي
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-1.5 focus-within:text-primary transition-colors">
                  <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
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
                    className="h-12 rounded-xl border-border/60 bg-background/50 px-4 transition-all duration-300 focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:bg-background"
                  />
                </div>

                <div className="space-y-1.5 focus-within:text-primary transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      كلمة المرور
                    </label>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="h-12 rounded-xl border-border/60 bg-background/50 px-4 transition-all duration-300 focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:bg-background"
                  />
                </div>
              </div>

              {loginError ? (
                <div className="animate-in fade-in slide-in-from-top-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center text-sm font-medium text-destructive backdrop-blur-sm">
                  {loginError}
                </div>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="group w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 font-bold tracking-wide text-primary-foreground shadow-[0_0_20px_var(--tw-shadow-color)] shadow-primary/20 transition-all duration-300 hover:shadow-primary/40 active:scale-[0.98]"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    تسجيل الدخول
                    <LogIn className="ms-2 h-5 w-5 transition-transform group-hover:-translate-x-1" />
                  </>
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-border/40 text-center">
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70">
                <Sparkles className="h-3.5 w-3.5 text-primary/50" />
                تطبيق School ERP محمي بأحدث تقنيات التشفير
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <Badge variant="outline" className="px-4 py-2 text-xs font-normal border-border/40 bg-background/30 backdrop-blur-xl text-muted-foreground shadow-sm">
            بيانات تجريبية: <span className="font-mono text-foreground mx-1">{DEFAULT_EMAIL}</span> / <span className="font-mono text-foreground mx-1">{DEFAULT_PASSWORD}</span>
          </Badge>
        </div>
      </div>
    </main>
  );
}
