import { expect, test } from "@playwright/test";
import { mockListWithPost } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

function buildListResponse(data: unknown[]) {
  return {
    data,
    pagination: {
      page: 1,
      limit: 100,
      total: data.length,
      totalPages: data.length === 0 ? 1 : 1,
    },
  };
}

test.describe("User Permissions", () => {
  test("loads list and creates a direct user permission", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.userPermissionsCrud);

    const users = [
      {
        id: "user-1",
        email: "admin@school.test",
        username: "admin",
        firstName: "أحمد",
        lastName: "العواضي",
        isActive: true,
        lastLoginAt: null,
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
        employee: null,
        userRoles: [],
      },
      {
        id: "user-2",
        email: "teacher@school.test",
        username: "teacher",
        firstName: "سارة",
        lastName: "الحداد",
        isActive: true,
        lastLoginAt: null,
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
        employee: null,
        userRoles: [],
      },
    ];

    const permissions = [
      {
        id: "perm-users-read",
        code: "users.read",
        resource: "users",
        action: "read",
        description: "قراءة المستخدمين",
        isSystem: true,
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
      },
      {
        id: "perm-users-update",
        code: "users.update",
        resource: "users",
        action: "update",
        description: "تعديل المستخدمين",
        isSystem: true,
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
      },
    ];

    await page.route("**/backend/users**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(users)),
      });
    });

    await page.route("**/backend/permissions**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(permissions)),
      });
    });

    const userPermissionsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/user-permissions**",
      initialItems: [
        {
          id: 1,
          userId: "user-1",
          permissionId: "perm-users-read",
          validFrom: "2026-03-01T00:00:00.000Z",
          validUntil: null,
          grantReason: "تفويض أساسي",
          notes: null,
          grantedById: "system",
          grantedAt: "2026-03-01T00:00:00.000Z",
          revokedAt: null,
          revokedById: null,
          revokeReason: null,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          user: {
            id: "user-1",
            email: "admin@school.test",
            firstName: "أحمد",
            lastName: "العواضي",
            isActive: true,
          },
          permission: {
            id: "perm-users-read",
            code: "users.read",
            resource: "users",
            action: "read",
            deletedAt: null,
          },
          grantedBy: {
            id: "system",
            email: "system@school.test",
          },
          revokedBy: null,
          createdBy: null,
          updatedBy: null,
        },
      ],
      onCreate: (payload) => {
        const userId = typeof payload.userId === "string" ? payload.userId : "user-2";
        const permissionId =
          typeof payload.permissionId === "string"
            ? payload.permissionId
            : "perm-users-update";
        const user = users.find((item) => item.id === userId) ?? users[1];
        const permission =
          permissions.find((item) => item.id === permissionId) ?? permissions[1];

        return {
          id: 2,
          userId,
          permissionId,
          validFrom:
            typeof payload.validFrom === "string"
              ? payload.validFrom
              : "2026-03-02T00:00:00.000Z",
          validUntil:
            typeof payload.validUntil === "string" ? payload.validUntil : null,
          grantReason:
            typeof payload.grantReason === "string"
              ? payload.grantReason
              : "تفويض",
          notes: typeof payload.notes === "string" ? payload.notes : null,
          grantedById: "system",
          grantedAt: "2026-03-02T00:00:00.000Z",
          revokedAt: null,
          revokedById: null,
          revokeReason: null,
          createdAt: "2026-03-02T00:00:00.000Z",
          updatedAt: "2026-03-02T00:00:00.000Z",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
          },
          permission: {
            id: permission.id,
            code: permission.code,
            resource: permission.resource,
            action: permission.action,
            deletedAt: null,
          },
          grantedBy: {
            id: "system",
            email: "system@school.test",
          },
          revokedBy: null,
          createdBy: null,
          updatedBy: null,
        };
      },
    });

    await openModulePage({
      page,
      path: "/app/user-permissions",
      heading: "الصلاحيات المباشرة",
    });
    await expectCardsCount(page, "user-permission-card", 1);

    await page.getByTestId("user-permission-form-user").selectOption("user-2");
    await page
      .getByTestId("user-permission-form-permission-perm-users-update")
      .click();
    await page
      .getByTestId("user-permission-form-grant-reason")
      .fill("تفويض مؤقت لإدارة المستخدمين");
    await page.getByTestId("user-permission-form-submit").click();

    await expectCardsCount(page, "user-permission-card", 2);
    await expect(
      page
        .getByTestId("user-permission-card")
        .first()
        .getByText("teacher@school.test", { exact: true }),
    ).toBeVisible();

    const lastCreatePayload = userPermissionsApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["userId"]).toBe("user-2");
    expect(lastCreatePayload?.["permissionId"]).toBe("perm-users-update");
    expect(lastCreatePayload?.["grantReason"]).toBe("تفويض مؤقت لإدارة المستخدمين");
  });

  test("validates at least one permission is selected", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.userPermissionsCrud);

    const users = [
      {
        id: "user-1",
        email: "admin@school.test",
        username: "admin",
        firstName: "أحمد",
        lastName: "العواضي",
        isActive: true,
        lastLoginAt: null,
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
        employee: null,
        userRoles: [],
      },
    ];
    const permissions = [
      {
        id: "perm-users-read",
        code: "users.read",
        resource: "users",
        action: "read",
        description: "قراءة المستخدمين",
        isSystem: true,
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
      },
    ];

    await page.route("**/backend/users**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(users)),
      });
    });
    await page.route("**/backend/permissions**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(permissions)),
      });
    });

    const userPermissionsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/user-permissions**",
      initialItems: [],
    });

    await openModulePage({
      page,
      path: "/app/user-permissions",
      heading: "الصلاحيات المباشرة",
    });

    await page.getByTestId("user-permission-form-user").selectOption("user-1");
    await page
      .getByTestId("user-permission-form-grant-reason")
      .fill("اختبار التحقق");
    await page.getByTestId("user-permission-form-submit").click();

    await expectValidationMessage(page, "اختر المستخدم وصلاحية واحدة على الأقل.");
    expect(userPermissionsApi.getPostCount()).toBe(0);
  });
});
