import { expect, test, type Page, type Route } from "@playwright/test";
import { injectAuthSession } from "./helpers/auth-session";
import { e2ePermissionSets } from "./helpers/permissions";
import { openModulePage } from "./helpers/ui-assertions";

type NotificationRecord = {
  id: string;
  userId: string;
  title: string;
  message: string;
  notificationType: "INFO" | "SUCCESS" | "WARNING" | "ACTION_REQUIRED";
  resource: string | null;
  resourceId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  triggeredByUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
};

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockUserNotifications(page: Page, initialItems: NotificationRecord[]) {
  let items = [...initialItems];
  let preferences = {
    userId: "user-1",
    inAppEnabled: true,
    actionRequiredOnly: false,
    leaveNotificationsEnabled: true,
    contractNotificationsEnabled: true,
    documentNotificationsEnabled: true,
    lifecycleNotificationsEnabled: true,
    updatedAt: "2026-04-01T07:00:00.000Z",
  };
  let lastPreferencesPayload: Record<string, unknown> | null = null;

  await page.route("**/backend/user-notifications**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const method = route.request().method();

    if (pathname.endsWith("/user-notifications/mark-all-read") && method === "PATCH") {
      items = items.map((item) =>
        item.isRead
          ? item
          : {
              ...item,
              isRead: true,
              readAt: "2026-04-01T09:00:00.000Z",
            },
      );

      await fulfillJson(route, { success: true, updatedCount: items.length });
      return;
    }

    if (pathname.includes("/user-notifications/") && pathname.endsWith("/read") && method === "PATCH") {
      const notificationId = pathname.split("/").slice(-2)[0];
      items = items.map((item) =>
        item.id === notificationId
          ? {
              ...item,
              isRead: true,
              readAt: "2026-04-01T08:00:00.000Z",
            }
          : item,
      );

      const notification = items.find((item) => item.id === notificationId);
      await fulfillJson(route, notification ?? { message: "Not found" }, notification ? 200 : 404);
      return;
    }

    if (pathname.includes("/user-notifications/") && method === "DELETE") {
      const notificationId = pathname.split("/").pop() ?? "";
      items = items.filter((item) => item.id !== notificationId);
      await fulfillJson(route, { success: true, id: notificationId });
      return;
    }

    if (pathname.endsWith("/user-notifications/unread-count") && method === "GET") {
      await fulfillJson(route, {
        unreadCount: items.filter((item) => !item.isRead).length,
      });
      return;
    }

    if (pathname.endsWith("/user-notifications/preferences") && method === "GET") {
      await fulfillJson(route, preferences);
      return;
    }

    if (pathname.endsWith("/user-notifications/preferences") && method === "PATCH") {
      lastPreferencesPayload = JSON.parse(route.request().postData() ?? "{}") as Record<
        string,
        unknown
      >;
      preferences = {
        ...preferences,
        ...lastPreferencesPayload,
        updatedAt: "2026-04-02T08:00:00.000Z",
      };
      await fulfillJson(route, preferences);
      return;
    }

    if (pathname.endsWith("/user-notifications") && method === "GET") {
      await fulfillJson(route, {
        data: items,
        unreadCount: items.filter((item) => !item.isRead).length,
        pagination: {
          page: 1,
          limit: 12,
          total: items.length,
          totalPages: 1,
        },
      });
      return;
    }

    await route.continue();
  });

  return {
    getLastPreferencesPayload: () => lastPreferencesPayload,
  };
}

function buildNotification(id: string, overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    id,
    userId: "user-1",
    title: "تم اعتماد طلب الإجازة",
    message: "تم اعتماد طلب إجازتك السنوية.",
    notificationType: "SUCCESS",
    resource: "employee-leaves",
    resourceId: "leave-1",
    actionUrl: "/app/employee-leaves",
    isRead: false,
    readAt: null,
    createdAt: "2026-04-01T07:00:00.000Z",
    updatedAt: "2026-04-01T07:00:00.000Z",
    triggeredByUser: {
      id: "admin-1",
      email: "admin@school.local",
      firstName: "Admin",
      lastName: "User",
    },
    ...overrides,
  };
}

test.describe("User Notifications", () => {
  test("loads notifications and supports read, read-all, and delete actions", async ({
    page,
  }) => {
    await injectAuthSession(page, e2ePermissionSets.userNotificationsManage);

    const notificationsApi = await mockUserNotifications(page, [
      buildNotification("notif-1", {
        title: "طلب إجازة بانتظار الاعتماد",
        message: "هناك طلب إجازة جديد يحتاج إلى اعتمادك.",
        notificationType: "ACTION_REQUIRED",
      }),
      buildNotification("notif-2", {
        title: "تم رفض طلب الإجازة",
        message: "تم رفض طلب الإجازة لعدم اكتمال الرصيد.",
        notificationType: "WARNING",
      }),
    ]);

    await openModulePage({
      page,
      path: "/app/user-notifications",
      heading: "إشعاراتي",
    });

    await expect(page.getByTestId("user-notification-card")).toHaveCount(2);
    await expect(page.getByText("غير المقروء: 2")).toBeVisible();

    await page.getByTestId("user-notification-card").first().getByTestId("user-notification-mark-read").click();
    await expect(page.getByText("غير المقروء: 1")).toBeVisible();

    await page.getByRole("button", { name: "قراءة الكل" }).click();
    await expect(page.getByText("غير المقروء: 0")).toBeVisible();

    await page.getByTestId("pref-document-enabled").uncheck();
    await page.getByTestId("pref-action-required-only").check();
    await page.getByTestId("user-notification-preferences-save").click();
    await expect(page.getByTestId("user-notification-preferences-message")).toContainText(
      "تم حفظ تفضيلات الإشعارات بنجاح.",
    );
    expect(notificationsApi.getLastPreferencesPayload()).toMatchObject({
      documentNotificationsEnabled: false,
      actionRequiredOnly: true,
    });

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("user-notification-card").nth(1).getByTestId("user-notification-delete").click();
    await expect(page.getByTestId("user-notification-card")).toHaveCount(1);
  });

  test("shows unread count in the header and updates it after read actions", async ({
    page,
  }) => {
    await injectAuthSession(page, e2ePermissionSets.userNotificationsManage);

    await mockUserNotifications(page, [
      buildNotification("notif-header-1", {
        title: "طلب بانتظار موافقتك",
        notificationType: "ACTION_REQUIRED",
      }),
      buildNotification("notif-header-2", {
        title: "تنبيه قرب انتهاء عقد",
        notificationType: "WARNING",
      }),
    ]);

    await openModulePage({
      page,
      path: "/app/user-notifications",
      heading: "إشعاراتي",
    });

    await expect(page.getByTestId("header-user-notifications-link")).toBeVisible();
    await expect(page.getByTestId("header-user-notifications-badge")).toHaveText("2");

    await page.getByTestId("user-notification-card").first().getByTestId("user-notification-mark-read").click();
    await expect(page.getByTestId("header-user-notifications-badge")).toHaveText("1");

    await page.getByRole("button", { name: "قراءة الكل" }).click();
    await expect(page.getByTestId("header-user-notifications-badge")).toBeHidden();
  });

  test("shows read-only access without destructive actions", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.userNotificationsReadOnly);

    await mockUserNotifications(page, [
      buildNotification("notif-read-only"),
    ]);

    await openModulePage({
      page,
      path: "/app/user-notifications",
      heading: "إشعاراتي",
    });

    await expect(page.getByTestId("user-notification-card")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "قراءة الكل" })).toBeDisabled();
    await expect(page.getByTestId("user-notification-mark-read")).toBeDisabled();
    await expect(page.getByTestId("user-notification-delete")).toBeDisabled();
  });
});
