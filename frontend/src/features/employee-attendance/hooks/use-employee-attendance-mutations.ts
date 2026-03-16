"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateEmployeeAttendancePayload,
  type UpdateEmployeeAttendancePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateEmployeeAttendance() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["employee-attendance", "list"],
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

export function useCreateEmployeeAttendanceMutation() {
  const invalidate = useInvalidateEmployeeAttendance();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateEmployeeAttendancePayload) =>
      apiClient.createEmployeeAttendance(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateEmployeeAttendanceMutation() {
  const invalidate = useInvalidateEmployeeAttendance();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      attendanceId: string;
      payload: UpdateEmployeeAttendancePayload;
    }) => apiClient.updateEmployeeAttendance(params.attendanceId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteEmployeeAttendanceMutation() {
  const invalidate = useInvalidateEmployeeAttendance();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (attendanceId: string) =>
      apiClient.deleteEmployeeAttendance(attendanceId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


