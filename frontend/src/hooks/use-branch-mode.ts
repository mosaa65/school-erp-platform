"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { fetchBranchConfig } from "@/features/system-settings/api/branch-mode.api";

export type BranchModeResult = {
  isMultiBranchEnabled: boolean;
  defaultBranchId: number | null;
  isLoaded: boolean;
  isLoading: boolean;
  invalidate: () => void;
};

export const BRANCH_CONFIG_QUERY_KEY = ["system-settings", "branch-config"] as const;

/**
 * useBranchMode
 *
 * يقرأ حالة ميزة الفروع المتعددة من Backend.
 * يُخزِّن النتيجة في TanStack Query cache.
 *
 * مثال:
 *   const { isMultiBranchEnabled } = useBranchMode();
 *   {isMultiBranchEnabled && <BranchSelector />}
 */
export function useBranchMode(): BranchModeResult {
  const auth = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: BRANCH_CONFIG_QUERY_KEY,
    enabled: auth.isHydrated && auth.isAuthenticated,
    staleTime: 5 * 60 * 1_000, // 5 دقائق
    queryFn: () => fetchBranchConfig(auth.session!.accessToken),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: BRANCH_CONFIG_QUERY_KEY });
  };

  return {
    isMultiBranchEnabled: data?.isMultiBranchEnabled ?? false,
    defaultBranchId: data?.defaultBranchId ?? null,
    isLoaded: !isLoading && !isError,
    isLoading,
    invalidate,
  };
}
