"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateFeeStructurePayload,
  type UpdateFeeStructurePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateFeeStructures() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["fee-structures", "list"],
    });
  };
}

export function useCreateFeeStructureMutation() {
  const invalidate = useInvalidateFeeStructures();
  const auth = useAuth();

  return useMutation({
    mutationFn: (payload: CreateFeeStructurePayload) =>
      apiClient.createFeeStructure(payload),
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}

export function useUpdateFeeStructureMutation() {
  const invalidate = useInvalidateFeeStructures();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { feeStructureId: number; payload: UpdateFeeStructurePayload }) =>
      apiClient.updateFeeStructure(String(params.feeStructureId), params.payload),
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}

export function useDeleteFeeStructureMutation() {
  const invalidate = useInvalidateFeeStructures();
  const auth = useAuth();

  return useMutation({
    mutationFn: (feeStructureId: number) =>
      apiClient.deleteFeeStructure(String(feeStructureId)),
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}
