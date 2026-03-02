"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateSchoolProfilePayload,
  type UpdateSchoolProfilePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateSchoolProfiles() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["school-profiles", "list"],
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

export function useCreateSchoolProfileMutation() {
  const invalidate = useInvalidateSchoolProfiles();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateSchoolProfilePayload) =>
      apiClient.createSchoolProfile(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateSchoolProfileMutation() {
  const invalidate = useInvalidateSchoolProfiles();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      schoolProfileId: string;
      payload: UpdateSchoolProfilePayload;
    }) => apiClient.updateSchoolProfile(params.schoolProfileId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteSchoolProfileMutation() {
  const invalidate = useInvalidateSchoolProfiles();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (schoolProfileId: string) =>
      apiClient.deleteSchoolProfile(schoolProfileId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


