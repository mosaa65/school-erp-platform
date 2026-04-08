"use client";

import { useMutation } from "@tanstack/react-query";
import type { LoginPayload, LoginResponse } from "@/lib/api/client";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function useLoginMutation() {
  const auth = useAuth();

  return useMutation({
    mutationFn: (payload: LoginPayload) => apiClient.login(payload),
    onSuccess: (response: LoginResponse) => {
      if ("accessToken" in response) {
        auth.signIn(response);
      }
    },
  });
}


