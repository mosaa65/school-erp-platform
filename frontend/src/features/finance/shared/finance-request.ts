import { ApiError } from "@/lib/api/client";
import { getAccessTokenFromStorage } from "@/lib/auth/session";
import { appConfig } from "@/lib/env";

type FinanceRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  params?: Record<string, string | number | boolean | undefined>;
  json?: unknown;
};

function buildQueryString(
  params: Record<string, string | number | boolean | undefined> = {},
): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function resolveErrorMessage(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (Array.isArray(message)) {
      return message.join(", ");
    }
    return String(message);
  }

  if (typeof body === "string" && body.trim()) {
    return body;
  }

  return `فشل الطلب (رمز الحالة: ${status})`;
}

export async function financeRequest<T>(
  path: string,
  options: FinanceRequestOptions = {},
): Promise<T> {
  const token = getAccessTokenFromStorage();

  if (!token) {
    throw new ApiError("جلسة الدخول غير متاحة. يرجى تسجيل الدخول مرة أخرى.", 401);
  }

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }

  const queryString = buildQueryString(options.params);
  const response = await fetch(`${appConfig.apiProxyPrefix}${path}${queryString}`, {
    method: options.method ?? "GET",
    headers,
    body,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const responseBody = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(responseBody, response.status), response.status);
  }

  return responseBody as T;
}
