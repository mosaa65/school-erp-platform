"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CalculateAnnualResultsPayload,
  type CreateAnnualResultPayload,
  type UpdateAnnualResultPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateAnnualResults() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["annual-results", "list"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["annual-grades", "list"],
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

export function useCreateAnnualResultMutation() {
  const invalidate = useInvalidateAnnualResults();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateAnnualResultPayload) => apiClient.createAnnualResult(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useCalculateAnnualResultsMutation() {
  const invalidate = useInvalidateAnnualResults();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CalculateAnnualResultsPayload) =>
      apiClient.calculateAnnualResults(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateAnnualResultMutation() {
  const invalidate = useInvalidateAnnualResults();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { annualResultId: string; payload: UpdateAnnualResultPayload }) =>
      apiClient.updateAnnualResult(params.annualResultId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useLockAnnualResultMutation() {
  const invalidate = useInvalidateAnnualResults();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (annualResultId: string) => apiClient.lockAnnualResult(annualResultId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUnlockAnnualResultMutation() {
  const invalidate = useInvalidateAnnualResults();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (annualResultId: string) => apiClient.unlockAnnualResult(annualResultId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteAnnualResultMutation() {
  const invalidate = useInvalidateAnnualResults();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (annualResultId: string) => apiClient.deleteAnnualResult(annualResultId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


