"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/features/auth/providers/auth-provider";
import { BranchModeProvider } from "@/components/providers/branch-mode-provider";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          {/* تسخين cache إعدادات الفروع فور اكتمال الـ auth */}
          <BranchModeProvider>
            {children}
          </BranchModeProvider>
          {process.env.NODE_ENV === "development" ? (
            <ReactQueryDevtools initialIsOpen={false} />
          ) : null}
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
