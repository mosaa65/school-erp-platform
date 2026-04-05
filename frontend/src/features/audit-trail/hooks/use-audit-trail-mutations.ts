"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { financeRequest } from "@/features/finance/shared/finance-request";

function useInvalidateAuditTrail() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["audit-trail", "list"] });
  };
}

function useHandleAuthFailure() {
  const auth = useAuth();

  return (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      auth.signOut();
    }
  };
}

export function useDeleteAuditTrailMutation() {
  const invalidate = useInvalidateAuditTrail();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (auditTrailId: string | number) =>
      financeRequest(`/finance/audit-trail/${auditTrailId}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
