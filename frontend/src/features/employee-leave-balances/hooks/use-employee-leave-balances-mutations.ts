"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateEmployeeLeaveBalancePayload,
  type GenerateEmployeeLeaveBalancesPayload,
  type UpdateEmployeeLeaveBalancePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateEmployeeLeaveBalances() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["employee-leave-balances", "list"],
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

export function useCreateEmployeeLeaveBalanceMutation() {
  const invalidate = useInvalidateEmployeeLeaveBalances();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateEmployeeLeaveBalancePayload) =>
      apiClient.createEmployeeLeaveBalance(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateEmployeeLeaveBalanceMutation() {
  const invalidate = useInvalidateEmployeeLeaveBalances();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      balanceId: string;
      payload: UpdateEmployeeLeaveBalancePayload;
    }) => apiClient.updateEmployeeLeaveBalance(params.balanceId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteEmployeeLeaveBalanceMutation() {
  const invalidate = useInvalidateEmployeeLeaveBalances();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (balanceId: string) => apiClient.deleteEmployeeLeaveBalance(balanceId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useGenerateEmployeeLeaveBalancesMutation() {
  const invalidate = useInvalidateEmployeeLeaveBalances();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: GenerateEmployeeLeaveBalancesPayload) =>
      apiClient.generateEmployeeLeaveBalances(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
