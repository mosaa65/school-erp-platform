"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateTimetableEntryPayload,
  type UpdateTimetableEntryPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateTimetableEntries() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["timetable-entries", "list"],
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

export function useCreateTimetableEntryMutation() {
  const invalidate = useInvalidateTimetableEntries();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateTimetableEntryPayload) =>
      apiClient.createTimetableEntry(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateTimetableEntryMutation() {
  const invalidate = useInvalidateTimetableEntries();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      entryId: string;
      payload: UpdateTimetableEntryPayload;
    }) => apiClient.updateTimetableEntry(params.entryId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteTimetableEntryMutation() {
  const invalidate = useInvalidateTimetableEntries();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (entryId: string) => apiClient.deleteTimetableEntry(entryId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


