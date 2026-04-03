/**
 * branch-mode.api.ts
 *
 * API client بسيط للـ branch config endpoint.
 * منفصل عن auto-generated client.ts لتجنب تعارض الـ codegen.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type BranchConfigResponse = {
  isMultiBranchEnabled: boolean;
  defaultBranchId: number | null;
};

/**
 * جلب إعدادات الفروع من Backend.
 * يتطلب Bearer token في الـ Authorization header.
 */
export async function fetchBranchConfig(
  token: string,
): Promise<BranchConfigResponse> {
  const res = await fetch(`${API_BASE}/system-settings/branch-config`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`getBranchConfig failed: ${res.status}`);
  }

  return res.json() as Promise<BranchConfigResponse>;
}

/**
 * تحديث قيمة MULTI_BRANCH_MODE.
 * يتطلب صلاحية system-settings.update.
 */
export async function updateMultiBranchMode(
  settingId: number,
  enabled: boolean,
  token: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/system-settings/${settingId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ settingValue: String(enabled) }),
  });

  if (!res.ok) {
    throw new Error(`updateMultiBranchMode failed: ${res.status}`);
  }
}
