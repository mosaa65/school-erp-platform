"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type SystemSettingType } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseSystemSettingsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  settingType?: SystemSettingType;
  isEditable?: boolean;
};

export function useSystemSettingsQuery(options: UseSystemSettingsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "system-settings",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.category ?? "",
      options.settingType ?? "all",
      options.isEditable === undefined ? "all" : options.isEditable ? "editable" : "readonly",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listSystemSettings({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          category: options.category,
          settingType: options.settingType,
          isEditable: options.isEditable,
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
