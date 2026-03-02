"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreatePromotionDecisionPayload,
  type UpdatePromotionDecisionPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidatePromotionDecisions() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["promotion-decisions", "list"],
    });
  };
}

function useHandleAuthFailure() {
  const auth = useAuth();

  return (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      auth.signOut();
    }
  };
}

export function useCreatePromotionDecisionMutation() {
  const invalidate = useInvalidatePromotionDecisions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreatePromotionDecisionPayload) =>
      apiClient.createPromotionDecision(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdatePromotionDecisionMutation() {
  const invalidate = useInvalidatePromotionDecisions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      promotionDecisionId: string;
      payload: UpdatePromotionDecisionPayload;
    }) => apiClient.updatePromotionDecision(params.promotionDecisionId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeletePromotionDecisionMutation() {
  const invalidate = useInvalidatePromotionDecisions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (promotionDecisionId: string) =>
      apiClient.deletePromotionDecision(promotionDecisionId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


