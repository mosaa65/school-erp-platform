"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient, type PaymentGatewayType } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidatePaymentGateways() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["payment-gateways", "list"] });
  };
}

export function useTogglePaymentGatewayMutation() {
  const invalidate = useInvalidatePaymentGateways();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { gatewayId: number; isActive: boolean }) =>
      apiClient.updatePaymentGateway(params.gatewayId, { isActive: params.isActive }),
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

export function useSwitchPaymentGatewayTypeMutation() {
  const invalidate = useInvalidatePaymentGateways();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { gatewayId: number; gatewayType: PaymentGatewayType }) =>
      apiClient.updatePaymentGateway(params.gatewayId, { gatewayType: params.gatewayType }),
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
