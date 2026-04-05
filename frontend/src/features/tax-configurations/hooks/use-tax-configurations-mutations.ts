"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateTaxConfigurations() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["tax-configurations", "list"] });
  };
}

export function useToggleTaxConfigurationMutation() {
  const invalidate = useInvalidateTaxConfigurations();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { taxConfigurationId: number; isActive: boolean }) =>
      apiClient.updateTaxConfiguration(params.taxConfigurationId, { isActive: params.isActive }),
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
