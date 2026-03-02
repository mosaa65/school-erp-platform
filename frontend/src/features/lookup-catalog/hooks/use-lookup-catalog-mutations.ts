"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateLookupCatalogItemPayload,
  type LookupCatalogType,
  type UpdateLookupCatalogItemPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateLookupCatalog(lookupType: LookupCatalogType) {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["lookup-catalog", lookupType, "list"],
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

export function useCreateLookupCatalogItemMutation(lookupType: LookupCatalogType) {
  const invalidate = useInvalidateLookupCatalog(lookupType);
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateLookupCatalogItemPayload) =>
      apiClient.createLookupCatalogItem(lookupType, payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateLookupCatalogItemMutation(lookupType: LookupCatalogType) {
  const invalidate = useInvalidateLookupCatalog(lookupType);
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { itemId: number; payload: UpdateLookupCatalogItemPayload }) =>
      apiClient.updateLookupCatalogItem(lookupType, params.itemId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteLookupCatalogItemMutation(lookupType: LookupCatalogType) {
  const invalidate = useInvalidateLookupCatalog(lookupType);
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (itemId: number) => apiClient.deleteLookupCatalogItem(lookupType, itemId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
