"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateAuditLogs() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["audit-logs", "list"],
    });
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

export function useDeleteAuditLogMutation() {
  const invalidate = useInvalidateAuditLogs();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (auditLogId: string) => apiClient.deleteAuditLog(auditLogId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


