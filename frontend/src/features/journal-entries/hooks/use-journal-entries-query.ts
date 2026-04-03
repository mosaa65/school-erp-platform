"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type JournalEntryListItem as ApiJournalEntryListItem,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export type JournalEntryStatus = "DRAFT" | "APPROVED" | "POSTED" | "REVERSED";

export type JournalEntryListItem = {
  id: string;
  entryNo: string;
  date: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  status: JournalEntryStatus;
  source: string;
  createdBy: string;
};

type JournalEntriesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  status?: JournalEntryStatus;
};

type JournalEntriesQueryResult = {
  data: JournalEntryListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type JournalEntryApiShape = ApiJournalEntryListItem & {
  entryNumber?: string;
  entryDate?: string;
  referenceType?: string | null;
  source?: string | null;
  createdBy?: string | { email?: string } | null;
  createdByUser?: { email?: string } | null;
};

export function useJournalEntriesQuery(options: JournalEntriesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "journal-entries",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.status ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async (): Promise<JournalEntriesQueryResult> => {
      try {
        const response = await apiClient.listJournalEntries({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          status: options.status,
        });

        const data = response.data.map((entry) => {
          const entryRecord = entry as JournalEntryApiShape;
          const createdBy =
            typeof entryRecord.createdBy === "string"
              ? entryRecord.createdBy
              : entryRecord.createdBy?.email ?? entryRecord.createdByUser?.email ?? "-";

          return {
            id: entryRecord.id,
            entryNo: entryRecord.entryNumber ?? entryRecord.entryNo ?? "",
            date: entryRecord.entryDate ?? entryRecord.postingDate ?? "",
            description: entryRecord.description ?? "",
            totalDebit: Number(entryRecord.totalDebit ?? 0),
            totalCredit: Number(entryRecord.totalCredit ?? 0),
            status: entryRecord.status as JournalEntryStatus,
            source: entryRecord.referenceType ?? entryRecord.source ?? "غير محدد",
            createdBy,
          };
        });

        return {
          data,
          pagination: response.pagination,
        };
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
        throw error;
      }
    },
  });
}
