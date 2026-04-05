"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type PaymentTransactionStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidatePaymentTransactions() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["payment-transactions", "list"] });
  };
}

export function useUpdatePaymentTransactionStatusMutation() {
  const invalidate = useInvalidatePaymentTransactions();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { transactionId: string; status: PaymentTransactionStatus }) =>
      apiClient.updatePaymentTransaction(params.transactionId, { status: params.status }),
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

export function useCompleteAndReconcilePaymentTransactionMutation() {
  const invalidate = useInvalidatePaymentTransactions();
  const auth = useAuth();

  return useMutation({
    mutationFn: (transactionId: string) =>
      apiClient.completeAndReconcilePaymentTransaction(transactionId),
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
