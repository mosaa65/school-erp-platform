"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateStudentAttendancePayload,
  type UpdateStudentAttendancePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateStudentAttendance() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["student-attendance", "list"],
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

export function useCreateStudentAttendanceMutation() {
  const invalidate = useInvalidateStudentAttendance();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateStudentAttendancePayload) =>
      apiClient.createStudentAttendance(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateStudentAttendanceMutation() {
  const invalidate = useInvalidateStudentAttendance();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      attendanceId: string;
      payload: UpdateStudentAttendancePayload;
    }) => apiClient.updateStudentAttendance(params.attendanceId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteStudentAttendanceMutation() {
  const invalidate = useInvalidateStudentAttendance();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (attendanceId: string) => apiClient.deleteStudentAttendance(attendanceId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}



