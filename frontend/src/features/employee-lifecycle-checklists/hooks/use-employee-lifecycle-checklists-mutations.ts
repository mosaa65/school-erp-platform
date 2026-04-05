"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccessTokenFromStorage } from "@/lib/auth/session";
import {
  ApiError,
  apiClient,
  type CreateEmployeeLifecycleChecklistPayload,
  type EmployeeLifecycleChecklistListItem,
  type EmployeeLifecycleChecklistType,
  type GenerateEmployeeLifecycleChecklistDueAlertsPayload,
  type UpdateEmployeeLifecycleChecklistPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { appConfig } from "@/lib/env";

function useInvalidateEmployeeLifecycleChecklists() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["employee-lifecycle-checklists", "list"],
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

type GenerateEmployeeLifecycleChecklistTemplatesPayload = {
  employeeId: string;
  checklistType: EmployeeLifecycleChecklistType;
  assignedToEmployeeId?: string;
};

type GenerateEmployeeLifecycleChecklistTemplatesResult = {
  success: boolean;
  employeeId: string;
  checklistType: EmployeeLifecycleChecklistType;
  generatedCount: number;
  skippedCount: number;
  templateCount: number;
  items: EmployeeLifecycleChecklistListItem[];
};

async function generateEmployeeLifecycleChecklistTemplates(
  payload: GenerateEmployeeLifecycleChecklistTemplatesPayload,
): Promise<GenerateEmployeeLifecycleChecklistTemplatesResult> {
  const accessToken = getAccessTokenFromStorage();

  if (!accessToken) {
    throw new ApiError("جلسة الدخول غير متاحة. يرجى تسجيل الدخول مرة أخرى.", 401);
  }

  const response = await fetch(
    `${appConfig.apiProxyPrefix}/backend/employee-lifecycle-checklists/generate-templates`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
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
        : `تعذر توليد المهام الافتراضية (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return responseBody as GenerateEmployeeLifecycleChecklistTemplatesResult;
}

export function useCreateEmployeeLifecycleChecklistMutation() {
  const invalidate = useInvalidateEmployeeLifecycleChecklists();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateEmployeeLifecycleChecklistPayload) =>
      apiClient.createEmployeeLifecycleChecklist(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useGenerateEmployeeLifecycleChecklistTemplatesMutation() {
  const invalidate = useInvalidateEmployeeLifecycleChecklists();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: GenerateEmployeeLifecycleChecklistTemplatesPayload) =>
      generateEmployeeLifecycleChecklistTemplates(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateEmployeeLifecycleChecklistMutation() {
  const invalidate = useInvalidateEmployeeLifecycleChecklists();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      checklistId: string;
      payload: UpdateEmployeeLifecycleChecklistPayload;
    }) =>
      apiClient.updateEmployeeLifecycleChecklist(
        params.checklistId,
        params.payload,
      ),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteEmployeeLifecycleChecklistMutation() {
  const invalidate = useInvalidateEmployeeLifecycleChecklists();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (checklistId: string) =>
      apiClient.deleteEmployeeLifecycleChecklist(checklistId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useStartEmployeeLifecycleChecklistMutation() {
  const invalidate = useInvalidateEmployeeLifecycleChecklists();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (checklistId: string) =>
      apiClient.startEmployeeLifecycleChecklist(checklistId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useCompleteEmployeeLifecycleChecklistMutation() {
  const invalidate = useInvalidateEmployeeLifecycleChecklists();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (checklistId: string) =>
      apiClient.completeEmployeeLifecycleChecklist(checklistId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useWaiveEmployeeLifecycleChecklistMutation() {
  const invalidate = useInvalidateEmployeeLifecycleChecklists();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (checklistId: string) =>
      apiClient.waiveEmployeeLifecycleChecklist(checklistId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useGenerateEmployeeLifecycleChecklistDueAlertsMutation() {
  const invalidate = useInvalidateEmployeeLifecycleChecklists();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: GenerateEmployeeLifecycleChecklistDueAlertsPayload) =>
      apiClient.generateEmployeeLifecycleChecklistDueAlerts(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
