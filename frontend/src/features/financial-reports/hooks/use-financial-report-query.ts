"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { financeRequest } from "@/features/finance/shared/finance-request";

export type FinancialReportType =
  | "trial-balance"
  | "general-ledger"
  | "account-summary"
  | "income-statement"
  | "balance-sheet"
  | "student-account-statement"
  | "vat-report"
  | "accounts-receivable-aging";

export type FinancialReportResponse = {
  generatedAt?: string;
  scope?: Record<string, unknown>;
  rows?: Array<Record<string, unknown>>;
  summary?: Record<string, unknown>;
};

type UseFinancialReportQueryOptions = {
  reportType: FinancialReportType;
  params?: Record<string, string | number | boolean | undefined>;
  enabled?: boolean;
};

export function useFinancialReportQuery({
  reportType,
  params = {},
  enabled = true,
}: UseFinancialReportQueryOptions) {
  const auth = useAuth();
  const paramKey = JSON.stringify(params);

  return useQuery({
    queryKey: ["financial-reports", reportType, paramKey],
    enabled: enabled && auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await financeRequest<FinancialReportResponse>(
          `/finance/reports/${reportType}`,
          {
            params,
          },
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
  });
}
