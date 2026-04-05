"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateRecurringJournals() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["recurring-journals", "list"] });
  };
}

export function useGenerateRecurringJournalMutation() {
  const invalidate = useInvalidateRecurringJournals();
  const auth = useAuth();

  return useMutation({
    mutationFn: (journalId: number) => apiClient.generateRecurringJournal(journalId),
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

export function useToggleRecurringJournalStatusMutation() {
  const invalidate = useInvalidateRecurringJournals();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { journalId: number; isActive: boolean }) =>
      apiClient.updateRecurringJournal(params.journalId, { isActive: params.isActive }),
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
