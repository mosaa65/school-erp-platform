"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateCreditDebitNotes() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["credit-debit-notes", "list"] });
  };
}

export function useApproveCreditDebitNoteMutation() {
  const invalidate = useInvalidateCreditDebitNotes();
  const auth = useAuth();

  return useMutation({
    mutationFn: (noteId: string) => apiClient.approveCreditDebitNote(noteId),
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

export function useApplyCreditDebitNoteMutation() {
  const invalidate = useInvalidateCreditDebitNotes();
  const auth = useAuth();

  return useMutation({
    mutationFn: (noteId: string) => apiClient.applyCreditDebitNote(noteId),
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
