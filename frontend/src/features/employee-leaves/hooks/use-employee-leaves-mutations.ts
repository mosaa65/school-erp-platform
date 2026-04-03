"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { appConfig } from "@/lib/env";
import { getAccessTokenFromStorage } from "@/lib/auth/session";
import {
  ApiError,
  apiClient,
  type EmployeeLeaveListItem,
  type CreateEmployeeLeavePayload,
  type UpdateEmployeeLeavePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateEmployeeLeaves() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["employee-leaves", "list"],
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

async function cancelEmployeeLeaveRequest(leaveId: string): Promise<EmployeeLeaveListItem> {
  const accessToken = getAccessTokenFromStorage();

  if (!accessToken) {
    throw new ApiError("جلسة الدخول غير متاحة. يرجى تسجيل الدخول مرة أخرى.", 401);
  }

  const response = await fetch(
    `${appConfig.apiProxyPrefix}/backend/employee-leaves/${leaveId}/cancel`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  const contentType = response.headers.get("content-type") ?? "";
  const responseBody = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "message" in responseBody &&
      typeof responseBody.message === "string"
        ? responseBody.message
        : `تعذر إلغاء الطلب (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return responseBody as EmployeeLeaveListItem;
}

export function useCreateEmployeeLeaveMutation() {
  const invalidate = useInvalidateEmployeeLeaves();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateEmployeeLeavePayload) =>
      apiClient.createEmployeeLeave(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateEmployeeLeaveMutation() {
  const invalidate = useInvalidateEmployeeLeaves();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { leaveId: string; payload: UpdateEmployeeLeavePayload }) =>
      apiClient.updateEmployeeLeave(params.leaveId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useApproveEmployeeLeaveMutation() {
  const invalidate = useInvalidateEmployeeLeaves();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (leaveId: string) => apiClient.approveEmployeeLeave(leaveId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useRejectEmployeeLeaveMutation() {
  const invalidate = useInvalidateEmployeeLeaves();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (leaveId: string) => apiClient.rejectEmployeeLeave(leaveId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useCancelEmployeeLeaveMutation() {
  const invalidate = useInvalidateEmployeeLeaves();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (leaveId: string) => cancelEmployeeLeaveRequest(leaveId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteEmployeeLeaveMutation() {
  const invalidate = useInvalidateEmployeeLeaves();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (leaveId: string) => apiClient.deleteEmployeeLeave(leaveId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
