"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreditDebitNoteListItem,
  type CreditDebitNoteStatus,
  type CreditDebitNoteType,
  type CreditDebitNoteReason,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export type { CreditDebitNoteListItem, CreditDebitNoteStatus, CreditDebitNoteType, CreditDebitNoteReason };

type CreditDebitNotesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  status?: CreditDebitNoteStatus;
  type?: CreditDebitNoteType;
  reason?: CreditDebitNoteReason;
};

export function useCreditDebitNotesQuery(options: CreditDebitNotesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "credit-debit-notes",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.status ?? "all",
      options.type ?? "all",
      options.reason ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listCreditDebitNotes({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          status: options.status,
          noteType: options.type,
          reason: options.reason,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
  });
}
