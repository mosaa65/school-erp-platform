"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { appConfig } from "@/lib/env";
import { getAccessTokenFromStorage } from "@/lib/auth/session";
import {
  ApiError,
  apiClient,
  type CreateEmployeeContractPayload,
  type EmployeeContractListItem,
  type GenerateEmployeeContractExpiryAlertsPayload,
  type UpdateEmployeeContractPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateEmployeeContracts() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["employee-contracts", "list"],
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

async function createEmployeeContractRenewalDraft(
  contractId: string,
): Promise<EmployeeContractListItem> {
  const accessToken = getAccessTokenFromStorage();

  if (!accessToken) {
    throw new ApiError("جلسة الدخول غير متاحة. يرجى تسجيل الدخول مرة أخرى.", 401);
  }

  const response = await fetch(
    `${appConfig.apiProxyPrefix}/backend/employee-contracts/${contractId}/renew-draft`,
    {
      method: "POST",
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
        : `تعذر إنشاء مسودة التجديد (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return responseBody as EmployeeContractListItem;
}

export function useCreateEmployeeContractMutation() {
  const invalidate = useInvalidateEmployeeContracts();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateEmployeeContractPayload) =>
      apiClient.createEmployeeContract(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateEmployeeContractMutation() {
  const invalidate = useInvalidateEmployeeContracts();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { contractId: string; payload: UpdateEmployeeContractPayload }) =>
      apiClient.updateEmployeeContract(params.contractId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteEmployeeContractMutation() {
  const invalidate = useInvalidateEmployeeContracts();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (contractId: string) => apiClient.deleteEmployeeContract(contractId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useCreateEmployeeContractRenewalDraftMutation() {
  const invalidate = useInvalidateEmployeeContracts();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (contractId: string) => createEmployeeContractRenewalDraft(contractId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useGenerateEmployeeContractExpiryAlertsMutation() {
  const invalidate = useInvalidateEmployeeContracts();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: GenerateEmployeeContractExpiryAlertsPayload = {}) =>
      apiClient.generateEmployeeContractExpiryAlerts(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
