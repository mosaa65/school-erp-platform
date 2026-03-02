import type { Page } from "@playwright/test";
import { defaultE2ePermissionCodes } from "./permissions";

export async function injectAuthSession(
  page: Page,
  permissionCodes: readonly string[] = defaultE2ePermissionCodes,
) {
  await page.context().addCookies([
    {
      name: "school_erp_access_token",
      value: "e2e-token",
      url: "http://localhost:3001",
    },
  ]);

  await page.addInitScript((permissions: string[]) => {
    const session = {
      accessToken: "e2e-token",
      tokenType: "Bearer",
      expiresIn: "1d",
      user: {
        id: "e2e-user-id",
        email: "e2e@school.local",
        firstName: "E2E",
        lastName: "User",
        roleCodes: ["SUPER_ADMIN"],
        permissionCodes: permissions,
      },
    };

    window.localStorage.setItem("school_erp_auth_session", JSON.stringify(session));
  }, [...permissionCodes]);
}
