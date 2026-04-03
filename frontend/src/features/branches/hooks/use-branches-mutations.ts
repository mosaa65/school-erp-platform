"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateFinanceBranchPayload,
  type UpdateFinanceBranchPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateBranches() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["branches", "list"],
    });
  };
}

export function useCreateBranchMutation() {
  const invalidate = useInvalidateBranches();
  const auth = useAuth();

  return useMutation({
    mutationFn: (payload: CreateFinanceBranchPayload) => apiClient.createBranch(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}

export function useUpdateBranchMutation() {
  const invalidate = useInvalidateBranches();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { branchId: number; payload: UpdateFinanceBranchPayload }) =>
      apiClient.updateBranch(String(params.branchId), params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}

export function useDeleteBranchMutation() {
  const invalidate = useInvalidateBranches();
  const auth = useAuth();

  return useMutation({
    mutationFn: (branchId: number) => apiClient.deleteBranch(String(branchId)),
    onSuccess: () => {
      invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}
