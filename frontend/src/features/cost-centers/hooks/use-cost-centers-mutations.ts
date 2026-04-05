"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateCostCenters() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["cost-centers", "list"] });
  };
}

export function useToggleCostCenterMutation() {
  const invalidate = useInvalidateCostCenters();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { costCenterId: number; isActive: boolean }) =>
      apiClient.updateCostCenter(params.costCenterId, { isActive: params.isActive }),
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
