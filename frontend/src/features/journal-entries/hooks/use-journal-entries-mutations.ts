"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function useApproveJournalEntryMutation() {
  const queryClient = useQueryClient();
  const auth = useAuth();

  return useMutation({
    mutationFn: (journalEntryId: string) =>
      apiClient.approveJournalEntry(journalEntryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["journal-entries", "list"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}

export function usePostJournalEntryMutation() {
  const queryClient = useQueryClient();
  const auth = useAuth();

  return useMutation({
    mutationFn: (journalEntryId: string) =>
      apiClient.postJournalEntry(journalEntryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["journal-entries", "list"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}

export function useReverseJournalEntryMutation() {
  const queryClient = useQueryClient();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { journalEntryId: string; reason: string }) =>
      apiClient.reverseJournalEntry(params.journalEntryId, params.reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["journal-entries", "list"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}
