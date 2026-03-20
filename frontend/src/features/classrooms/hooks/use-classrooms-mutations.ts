"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient, type CreateClassroomPayload, type UpdateClassroomPayload } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateClassrooms() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["classrooms", "list"],
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

export function useCreateClassroomMutation() {
  const invalidate = useInvalidateClassrooms();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateClassroomPayload) => apiClient.createClassroom(payload),
    onSuccess: () => invalidate(),
    onError: handleAuthFailure,
  });
}

export function useUpdateClassroomMutation() {
  const invalidate = useInvalidateClassrooms();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { classroomId: string; payload: UpdateClassroomPayload }) =>
      apiClient.updateClassroom(params.classroomId, params.payload),
    onSuccess: () => invalidate(),
    onError: handleAuthFailure,
  });
}

export function useDeleteClassroomMutation() {
  const invalidate = useInvalidateClassrooms();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (classroomId: string) => apiClient.deleteClassroom(classroomId),
    onSuccess: () => invalidate(),
    onError: handleAuthFailure,
  });
}
