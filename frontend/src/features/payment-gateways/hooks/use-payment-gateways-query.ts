"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type PaymentGatewayListItem,
  type PaymentGatewayType,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export type { PaymentGatewayListItem, PaymentGatewayType };

type PaymentGatewaysQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  gatewayType?: PaymentGatewayType;
};

export function usePaymentGatewaysQuery(options: PaymentGatewaysQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "payment-gateways",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.gatewayType ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listPaymentGateways({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          gatewayType: options.gatewayType,
          isActive: options.isActive,
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
