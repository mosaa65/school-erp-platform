import { expect, test } from "@playwright/test";
import { injectAuthSession } from "./helpers/auth-session";
import { openModulePage } from "./helpers/ui-assertions";

type AuditLogMockItem = {
  id: string;
  actorUserId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  status: "SUCCESS" | "FAILURE";
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  actorUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userRoles?: Array<{
      role: {
        id: string;
        code: string;
        name: string;
      };
    }>;
  } | null;
  timeline?: {
    totalChanges: number;
    previousChanges: number;
    displayedChanges: number;
    hasPreviousChanges: boolean;
  };
};

const DOMAIN_RESOURCE_KEYWORDS: Record<string, string[]> = {
  attendance: ["attendance", "absence", "presence"],
  grades: ["grade", "grading", "assessment", "exam", "score", "subject"],
  fees: ["fee", "invoice", "installment", "billing", "payment", "finance"],
  students: ["student", "enrollment", "guardian"],
  teachers: ["teacher", "employee", "staff"],
  permissions: ["permission", "role", "auth"],
  notifications: ["notification", "reminder"],
  system: ["setting", "audit", "catalog"],
};

const ACTION_ALIASES: Record<string, string[]> = {
  REJECT: ["REJECT", "UNAPPROVE", "REVOKE"],
};

function includesActionType(action: string, actionType: string): boolean {
  const normalizedType = actionType.trim().toUpperCase();
  const normalizedAction = action.trim().toUpperCase();
  const actionVariants = ACTION_ALIASES[normalizedType] ?? [normalizedType];

  return actionVariants.some(
    (variant) =>
      normalizedAction === variant || normalizedAction.endsWith(`_${variant}`),
  );
}

function includesDomain(resource: string, domain: string): boolean {
  const keywords = DOMAIN_RESOURCE_KEYWORDS[domain] ?? [];
  if (keywords.length === 0) {
    return true;
  }

  const normalizedResource = resource.toLowerCase();
  return keywords.some((keyword) => normalizedResource.includes(keyword));
}

function includesUser(log: AuditLogMockItem, userSearch: string): boolean {
  const needle = userSearch.toLowerCase();
  return [
    log.actorUserId ?? "",
    log.actorUser?.email ?? "",
    log.actorUser?.firstName ?? "",
    log.actorUser?.lastName ?? "",
  ].some((candidate) => candidate.toLowerCase().includes(needle));
}

function includesTextSearch(log: AuditLogMockItem, textSearch: string): boolean {
  const needle = textSearch.toLowerCase();
  return [
    log.action,
    log.resource,
    log.resourceId ?? "",
    log.ipAddress ?? "",
    log.userAgent ?? "",
    log.actorUserId ?? "",
    log.actorUser?.email ?? "",
    log.actorUser?.firstName ?? "",
    log.actorUser?.lastName ?? "",
  ].some((candidate) => candidate.toLowerCase().includes(needle));
}

test.describe("Audit Logs", () => {
  test("applies action/domain filters and opens full details", async ({ page }) => {
    await injectAuthSession(page, ["audit-logs.read", "audit-logs.update"]);

    const logs: AuditLogMockItem[] = [
      {
        id: "audit-1",
        actorUserId: "user-1",
        action: "USER_LOGIN",
        resource: "users",
        resourceId: "user-1",
        status: "SUCCESS",
        ipAddress: "10.0.0.2",
        userAgent: "Mozilla/5.0 Chrome/124.0",
        details: {
          description: "تم تسجيل دخول المستخدم إلى النظام.",
          _requestContext: {
            requestId: "req-login-001",
            correlationId: "corr-login-001",
            method: "POST",
            path: "/auth/login",
          },
        },
        occurredAt: "2026-04-10T08:00:00.000Z",
        createdAt: "2026-04-10T08:00:00.000Z",
        updatedAt: "2026-04-10T08:00:00.000Z",
        actorUser: {
          id: "user-1",
          email: "teacher@school.local",
          firstName: "Salem",
          lastName: "Teacher",
          userRoles: [
            {
              role: {
                id: "role-1",
                code: "TEACHER",
                name: "معلم",
              },
            },
          ],
        },
      },
      {
        id: "audit-2",
        actorUserId: "user-2",
        action: "STUDENT_UPDATE",
        resource: "students",
        resourceId: "stu-12",
        status: "SUCCESS",
        ipAddress: "10.0.0.8",
        userAgent: "Mozilla/5.0 Edge/126.0",
        details: {
          description: "تم تعديل بيانات الطالب الأساسية.",
          before: {
            fullName: "طالب قديم",
            status: "ACTIVE",
          },
          after: {
            fullName: "طالب جديد",
            status: "ACTIVE",
          },
          actorRoleCodes: ["REGISTRAR"],
          _requestContext: {
            requestId: "req-student-002",
            correlationId: "corr-student-002",
            method: "PATCH",
            path: "/students/stu-12",
          },
          ticketId: "INC-7781",
        },
        occurredAt: "2026-04-10T10:15:00.000Z",
        createdAt: "2026-04-10T10:15:00.000Z",
        updatedAt: "2026-04-10T10:15:00.000Z",
        actorUser: {
          id: "user-2",
          email: "admin@school.local",
          firstName: "Noura",
          lastName: "Admin",
          userRoles: [
            {
              role: {
                id: "role-2",
                code: "SCHOOL_ADMIN",
                name: "مدير النظام",
              },
            },
          ],
        },
      },
      {
        id: "audit-3",
        actorUserId: "user-3",
        action: "FINANCE_EXPORT",
        resource: "finance/revenues",
        resourceId: null,
        status: "FAILURE",
        ipAddress: "10.0.0.9",
        userAgent: "Mozilla/5.0 Safari/17.0",
        details: {
          description: "فشل تصدير تقرير الإيرادات.",
          errorMessage: "صلاحية التصدير غير متوفرة",
          _requestContext: {
            requestId: "req-finance-003",
            correlationId: "corr-finance-003",
            method: "GET",
            path: "/finance/revenues/export",
          },
        },
        occurredAt: "2026-04-10T11:30:00.000Z",
        createdAt: "2026-04-10T11:30:00.000Z",
        updatedAt: "2026-04-10T11:30:00.000Z",
        actorUser: {
          id: "user-3",
          email: "finance@school.local",
          firstName: "Huda",
          lastName: "Finance",
          userRoles: [
            {
              role: {
                id: "role-3",
                code: "FINANCE_MANAGER",
                name: "مدير مالي",
              },
            },
          ],
        },
      },
      {
        id: "audit-4",
        actorUserId: "user-2",
        action: "STUDENT_CREATE",
        resource: "students",
        resourceId: "stu-12",
        status: "SUCCESS",
        ipAddress: "10.0.0.12",
        userAgent: "Mozilla/5.0 Firefox/125.0",
        details: {
          description: "إنشاء سجل الطالب لأول مرة.",
          after: {
            fullName: "طالب قديم",
            status: "ACTIVE",
          },
          _requestContext: {
            requestId: "req-student-004",
            correlationId: "corr-student-004",
            method: "POST",
            path: "/students",
          },
        },
        occurredAt: "2026-04-09T11:30:00.000Z",
        createdAt: "2026-04-09T11:30:00.000Z",
        updatedAt: "2026-04-09T11:30:00.000Z",
        actorUser: {
          id: "user-2",
          email: "admin@school.local",
          firstName: "Noura",
          lastName: "Admin",
          userRoles: [
            {
              role: {
                id: "role-2",
                code: "SCHOOL_ADMIN",
                name: "مدير النظام",
              },
            },
          ],
        },
      },
    ];

    let lastListQuery = "";
    let listCalls = 0;
    let detailCalls = 0;
    let timelineCalls = 0;
    let rollbackCalls = 0;

    await page.route("**/backend/audit-logs**", async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      const pathParts = url.pathname.split("/").filter(Boolean);
      const auditLogsIndex = pathParts.findIndex((segment) => segment === "audit-logs");
      const auditLogId = auditLogsIndex >= 0 ? pathParts[auditLogsIndex + 1] : undefined;
      const isTimelineRoute =
        auditLogsIndex >= 0 && pathParts[auditLogsIndex + 2] === "timeline";
      const isRollbackRoute =
        auditLogsIndex >= 0 && pathParts[auditLogsIndex + 2] === "rollback";
      const isDetailsRoute =
        auditLogsIndex >= 0 &&
        typeof auditLogId === "string" &&
        auditLogId.length > 0 &&
        !isTimelineRoute &&
        !isRollbackRoute;

      if (method === "POST" && isRollbackRoute) {
        rollbackCalls += 1;
        const payload = route.request().postDataJSON() as {
          mode?: "PREVIOUS" | "TARGET";
          targetAuditLogId?: string;
        };

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            mode: payload.mode ?? "PREVIOUS",
            anchorAuditLogId: auditLogId,
            targetAuditLogId: payload.targetAuditLogId ?? "audit-4",
            rollbackAuditLogId: "rollback-1",
            resource: "students",
            resourceId: "stu-12",
            rolledBackAt: "2026-04-10T12:00:00.000Z",
            appliedFields: ["fullName", "status"],
          }),
        });
        return;
      }

      if (method !== "GET") {
        await route.fallback();
        return;
      }

      if (isTimelineRoute) {
        timelineCalls += 1;
        const item = logs.find((entry) => entry.id === auditLogId);

        if (!item) {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ message: "Not found" }),
          });
          return;
        }

        const timelineSource = [item, ...logs.filter((entry) => entry.id !== item.id)]
          .slice(0, 3)
          .map((entry, index) => ({
            ...entry,
            timelineOrder: index + 1,
            isLatest: index === 0,
          }));

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            resource: item.resource,
            resourceId: item.resourceId,
            anchorAuditLogId: item.id,
            limit: 10,
            total: timelineSource.length,
            data: timelineSource,
          }),
        });
        return;
      }

      if (isDetailsRoute) {
        detailCalls += 1;
        const item = logs.find((entry) => entry.id === auditLogId);
        if (!item) {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ message: "Not found" }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(item),
        });
        return;
      }

      listCalls += 1;
      lastListQuery = url.search;

      const actionType = url.searchParams.get("actionType")?.trim();
      const domain = url.searchParams.get("domain")?.trim();
      const status = url.searchParams.get("status")?.trim();
      const user = url.searchParams.get("user")?.trim();
      const search = url.searchParams.get("search")?.trim();

      let filtered = [...logs];

      if (actionType) {
        filtered = filtered.filter((entry) =>
          includesActionType(entry.action, actionType),
        );
      }

      if (domain) {
        filtered = filtered.filter((entry) => includesDomain(entry.resource, domain));
      }

      if (status) {
        filtered = filtered.filter((entry) => entry.status === status);
      }

      if (user) {
        filtered = filtered.filter((entry) => includesUser(entry, user));
      }

      if (search) {
        filtered = filtered.filter((entry) => includesTextSearch(entry, search));
      }

      const withTimeline = filtered.map((entry) => {
        const totalChanges =
          entry.resourceId === null
            ? 1
            : logs.filter(
                (candidate) =>
                  candidate.resource === entry.resource &&
                  candidate.resourceId === entry.resourceId,
              ).length || 1;

        return {
          ...entry,
          timeline: {
            totalChanges,
            previousChanges: Math.max(totalChanges - 1, 0),
            displayedChanges: Math.min(totalChanges, 10),
            hasPreviousChanges: totalChanges > 1,
          },
        };
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: withTimeline,
          pagination: {
            page: 1,
            limit: 15,
            total: filtered.length,
            totalPages: 1,
          },
        }),
      });
    });

    await openModulePage({
      page,
      path: "/app/audit-logs",
      heading: "سجل التدقيق",
    });

    await expect(page.getByTestId("audit-log-item")).toHaveCount(4);

    await page.getByTestId("audit-log-open-filters").click();
    await page.getByTestId("audit-log-filter-action-type").selectOption("UPDATE");
    await page.getByTestId("audit-log-filter-domain").selectOption("students");
    await page.getByTestId("audit-log-filters-apply").click();

    await expect(page.getByTestId("audit-log-item")).toHaveCount(1);
    const singleRow = page.getByTestId("audit-log-item").first();
    await expect(singleRow.getByText("Noura Admin", { exact: true })).toBeVisible();
    await expect(singleRow.getByText("الطلاب", { exact: true })).toBeVisible();

    expect(lastListQuery).toContain("actionType=UPDATE");
    expect(lastListQuery).toContain("domain=students");
    expect(listCalls).toBeGreaterThan(1);

    await page.getByTestId("audit-log-view-details-audit-2").click();

    await expect(
      page.getByRole("heading", { name: "تفاصيل سجل التدقيق" }),
    ).toBeVisible();
    await expect(page.getByText("معرف السجل Audit ID")).toBeVisible();
    await expect(page.getByText("audit-2")).toBeVisible();
    await expect(page.getByText("البيانات قبل التعديل")).toBeVisible();
    await expect(page.getByText("البيانات بعد التعديل")).toBeVisible();
    await expect(page.getByTestId("audit-log-timeline-section")).toBeVisible();
    await expect(page.getByText("آخر 10 تغييرات")).toBeVisible();
    await expect(page.getByText("Request ID")).toBeVisible();
    await expect(page.getByText("req-student-002")).toBeVisible();

    await page.locator(".audit-log-details-overlay").getByLabel("إغلاق").click();
    await page.getByTestId("audit-log-rollback-audit-2").click();
    await expect(
      page.getByRole("heading", { name: "التراجع من سجل التغييرات" }),
    ).toBeVisible();
    await expect(page.getByText("التراجع إلى التغيير السابق")).toBeVisible();
    await page.getByTestId("audit-log-rollback-previous").click();
    await expect(page.getByText("تم التراجع إلى التغيير السابق بنجاح.")).toBeVisible();

    expect(detailCalls).toBe(1);
    expect(timelineCalls).toBeGreaterThanOrEqual(2);
    expect(rollbackCalls).toBe(1);
  });
});
