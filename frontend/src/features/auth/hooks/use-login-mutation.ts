"use client";

import { useMutation } from "@tanstack/react-query";
import type { LoginPayload } from "@/lib/api/client";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function useLoginMutation() {
  const auth = useAuth();

  return useMutation({
    mutationFn: (payload: LoginPayload) => apiClient.login(payload),
    onSuccess: (session) => {
      auth.signIn(session);
    },
  });
}


