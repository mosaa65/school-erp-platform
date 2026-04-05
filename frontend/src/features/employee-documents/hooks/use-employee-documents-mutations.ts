"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateEmployeeDocumentPayload,
  type GenerateEmployeeDocumentExpiryAlertsPayload,
  type UpdateEmployeeDocumentPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateEmployeeDocuments() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["employee-documents", "list"],
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

export function useCreateEmployeeDocumentMutation() {
  const invalidate = useInvalidateEmployeeDocuments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateEmployeeDocumentPayload) =>
      apiClient.createEmployeeDocument(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateEmployeeDocumentMutation() {
  const invalidate = useInvalidateEmployeeDocuments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { documentId: string; payload: UpdateEmployeeDocumentPayload }) =>
      apiClient.updateEmployeeDocument(params.documentId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteEmployeeDocumentMutation() {
  const invalidate = useInvalidateEmployeeDocuments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (documentId: string) => apiClient.deleteEmployeeDocument(documentId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useGenerateEmployeeDocumentExpiryAlertsMutation() {
  const invalidate = useInvalidateEmployeeDocuments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: GenerateEmployeeDocumentExpiryAlertsPayload = {}) =>
      apiClient.generateEmployeeDocumentExpiryAlerts(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
