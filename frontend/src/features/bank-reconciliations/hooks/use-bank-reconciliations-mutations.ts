"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type BankReconciliationStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateBankReconciliations() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["bank-reconciliations", "list"] });
  };
}

export function useUpdateBankReconciliationStatusMutation() {
  const invalidate = useInvalidateBankReconciliations();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { reconciliationId: string; status: BankReconciliationStatus }) =>
      apiClient.updateBankReconciliation(params.reconciliationId, { status: params.status }),
    onSuccess: () => {
      invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}

export function useAutoMatchBankReconciliationTransactionsMutation() {
  const invalidate = useInvalidateBankReconciliations();
  const auth = useAuth();

  return useMutation({
    mutationFn: (reconciliationId: string) =>
      apiClient.autoMatchBankReconciliationTransactions(reconciliationId),
    onSuccess: () => {
      invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}
