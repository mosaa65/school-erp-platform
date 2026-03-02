"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateEmployeePayload,
  type UpdateEmployeePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateEmployees() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["employees"],
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

export function useCreateEmployeeMutation() {
  const invalidate = useInvalidateEmployees();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateEmployeePayload) => apiClient.createEmployee(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateEmployeeMutation() {
  const invalidate = useInvalidateEmployees();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { employeeId: string; payload: UpdateEmployeePayload }) =>
      apiClient.updateEmployee(params.employeeId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteEmployeeMutation() {
  const invalidate = useInvalidateEmployees();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (employeeId: string) => apiClient.deleteEmployee(employeeId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


