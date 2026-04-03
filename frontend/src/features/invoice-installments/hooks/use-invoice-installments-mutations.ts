"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateInvoiceInstallmentPayload,
  type UpdateInvoiceInstallmentPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateInvoiceInstallments() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["invoice-installments", "list"],
    });
  };
}

export function useCreateInvoiceInstallmentMutation() {
  const invalidate = useInvalidateInvoiceInstallments();
  const auth = useAuth();

  return useMutation({
    mutationFn: (payload: CreateInvoiceInstallmentPayload) =>
      apiClient.createInvoiceInstallment(payload),
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}

export function useUpdateInvoiceInstallmentMutation() {
  const invalidate = useInvalidateInvoiceInstallments();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { installmentId: string; payload: UpdateInvoiceInstallmentPayload }) =>
      apiClient.updateInvoiceInstallment(params.installmentId, params.payload),
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}

export function useDeleteInvoiceInstallmentMutation() {
  const invalidate = useInvalidateInvoiceInstallments();
  const auth = useAuth();

  return useMutation({
    mutationFn: (installmentId: string) =>
      apiClient.deleteInvoiceInstallment(installmentId),
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}
