"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export function useHealthCheck() {
  return useQuery({
    queryKey: ["system", "health"],
    queryFn: apiClient.healthCheck,
    refetchInterval: 30_000,
  });
}


