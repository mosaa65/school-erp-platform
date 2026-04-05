"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateEmployeeDepartmentPayload,
  type UpdateEmployeeDepartmentPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateEmployeeDepartments() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["employee-departments", "list"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["employees", "organization-options"],
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

export function useCreateEmployeeDepartmentMutation() {
  const invalidate = useInvalidateEmployeeDepartments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateEmployeeDepartmentPayload) =>
      apiClient.createEmployeeDepartment(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateEmployeeDepartmentMutation() {
  const invalidate = useInvalidateEmployeeDepartments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      departmentId: string;
      payload: UpdateEmployeeDepartmentPayload;
    }) => apiClient.updateEmployeeDepartment(params.departmentId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteEmployeeDepartmentMutation() {
  const invalidate = useInvalidateEmployeeDepartments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (departmentId: string) =>
      apiClient.deleteEmployeeDepartment(departmentId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
