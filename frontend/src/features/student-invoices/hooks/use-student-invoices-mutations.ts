"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateStudentInvoicePayload,
  type UpdateStudentInvoicePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateStudentInvoices() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["student-invoices", "list"],
    });
  };
}

export function useCreateStudentInvoiceMutation() {
  const invalidate = useInvalidateStudentInvoices();
  const auth = useAuth();

  return useMutation({
    mutationFn: (payload: CreateStudentInvoicePayload) =>
      apiClient.createStudentInvoice(payload),
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}

export function useUpdateStudentInvoiceMutation() {
  const invalidate = useInvalidateStudentInvoices();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { invoiceId: string; payload: UpdateStudentInvoicePayload }) =>
      apiClient.updateStudentInvoice(params.invoiceId, params.payload),
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}

export function useDeleteStudentInvoiceMutation() {
  const invalidate = useInvalidateStudentInvoices();
  const auth = useAuth();

  return useMutation({
    mutationFn: (invoiceId: string) => apiClient.deleteStudentInvoice(invoiceId),
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}
