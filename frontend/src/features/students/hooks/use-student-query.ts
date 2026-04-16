"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function useStudentQuery(studentId: string | null) {
  const auth = useAuth();

  return useQuery({
    queryKey: ["students", "details", studentId ?? "unknown"],
    enabled: auth.isHydrated && auth.isAuthenticated && typeof studentId === "string" && studentId.length > 0,
    queryFn: async () => {
      if (!studentId) {
        throw new Error("معرف الطالب غير صالح.");
      }

      try {
        return await apiClient.getStudent(studentId);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
  });
}
