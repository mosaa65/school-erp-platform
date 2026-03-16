"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateEmployeeCoursePayload,
  type UpdateEmployeeCoursePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateEmployeeCourses() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["employee-courses", "list"],
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

export function useCreateEmployeeCourseMutation() {
  const invalidate = useInvalidateEmployeeCourses();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateEmployeeCoursePayload) =>
      apiClient.createEmployeeCourse(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateEmployeeCourseMutation() {
  const invalidate = useInvalidateEmployeeCourses();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { courseId: string; payload: UpdateEmployeeCoursePayload }) =>
      apiClient.updateEmployeeCourse(params.courseId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteEmployeeCourseMutation() {
  const invalidate = useInvalidateEmployeeCourses();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (courseId: string) => apiClient.deleteEmployeeCourse(courseId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


