"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateDiscountRulePayload,
  type UpdateDiscountRulePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateDiscountRules() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["discount-rules", "list"],
    });
  };
}

export function useCreateDiscountRuleMutation() {
  const invalidate = useInvalidateDiscountRules();
  const auth = useAuth();

  return useMutation({
    mutationFn: (payload: CreateDiscountRulePayload) =>
      apiClient.createDiscountRule(payload),
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}

export function useUpdateDiscountRuleMutation() {
  const invalidate = useInvalidateDiscountRules();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { discountRuleId: number; payload: UpdateDiscountRulePayload }) =>
      apiClient.updateDiscountRule(String(params.discountRuleId), params.payload),
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}

export function useDeleteDiscountRuleMutation() {
  const invalidate = useInvalidateDiscountRules();
  const auth = useAuth();

  return useMutation({
    mutationFn: (discountRuleId: number) =>
      apiClient.deleteDiscountRule(String(discountRuleId)),
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}
