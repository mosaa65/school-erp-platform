import { expect, test } from "@playwright/test";
import { mockCrudList, mockEmployeesOptions } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { buildEmployeeFixtures } from "./helpers/fixtures";
import { fillEmployeeLeaveForm } from "./helpers/form-actions";
import { buildEmployeeLeaveListItem } from "./helpers/list-item-builders";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectTextVisible,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

test.describe("Employee Leaves", () => {
  test("loads list and creates a new leave request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeLeavesCrud);

    const employees = buildEmployeeFixtures(2);

    const leavesApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employee-leaves**",
      initialItems: [buildEmployeeLeaveListItem(employees[0])],
      onCreate: (payload) => {
        const employee =
          employees.find((item) => item.id === payload["employeeId"]) ?? employees[0];

        return buildEmployeeLeaveListItem(employee, {
          id: "leave-2",
          employeeId: String(payload["employeeId"] ?? employee.id),
          leaveType: String(payload["leaveType"] ?? "ANNUAL"),
          startDate: String(payload["startDate"] ?? "2026-04-20T00:00:00.000Z"),
          endDate: String(payload["endDate"] ?? "2026-04-22T00:00:00.000Z"),
          totalDays: 3,
          status: "PENDING",
          reason: payload["reason"] === undefined ? null : String(payload["reason"]),
          notes: payload["notes"] === undefined ? null : String(payload["notes"]),
        });
      },
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-leaves",
      heading: "طلبات الإجازات",
    });

    await expectCardsCount(page, "leave-card", 1);

    await page
      .getByRole("button", { name: "إنشاء طلب إجازة" })
      .evaluate((element) => (element as HTMLButtonElement).click());

    await fillEmployeeLeaveForm(page, {
      employeeId: "emp-2",
      leaveType: "SICK",
      startDate: "2026-04-20",
      endDate: "2026-04-22",
      reason: "Medical leave",
      notes: "Attached clinic notice",
      submit: true,
    });

    await expectCardsCount(page, "leave-card", 2);
    await expectTextVisible(page, "مرضية - 3 يوم");

    const lastCreatePayload = leavesApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["employeeId"]).toBe("emp-2");
    expect(lastCreatePayload?.["leaveType"]).toBe("SICK");
    expect(lastCreatePayload?.["status"]).toBeUndefined();
  });

  test("approves, rejects, and cancels pending leave requests through workflow actions", async ({
    page,
  }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeLeavesCrud);

    const employees = buildEmployeeFixtures(2);

    await mockCrudList({
      page,
      urlPattern: "**/backend/employee-leaves**",
      initialItems: [
        buildEmployeeLeaveListItem(employees[0], {
          id: "leave-approve",
          status: "PENDING",
          approvedAt: null,
        }),
        buildEmployeeLeaveListItem(employees[1], {
          id: "leave-reject",
          status: "PENDING",
          approvedAt: null,
          leaveType: "EMERGENCY",
        }),
        buildEmployeeLeaveListItem(employees[0], {
          id: "leave-cancel",
          status: "PENDING",
          approvedAt: null,
          leaveType: "ANNUAL",
        }),
      ],
      onUpdate: (_payload, context) => {
        if (context.action === "approve") {
          return {
            ...context.item,
            status: "APPROVED",
            approvedAt: "2026-04-15T00:00:00.000Z",
            approvedBy: {
              id: "user-1",
              email: "admin@school.local",
              firstName: "Admin",
              lastName: "User",
            },
          };
        }

        if (context.action === "reject") {
          return {
            ...context.item,
            status: "REJECTED",
            approvedAt: "2026-04-15T00:00:00.000Z",
            approvedBy: {
              id: "user-1",
              email: "admin@school.local",
              firstName: "Admin",
              lastName: "User",
            },
          };
        }

        if (context.action === "cancel") {
          return {
            ...context.item,
            status: "CANCELLED",
            approvedAt: null,
            approvedBy: null,
          };
        }

        return {
          ...context.item,
        };
      },
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-leaves",
      heading: "طلبات الإجازات",
    });

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("leave-card").nth(0).getByTestId("leave-approve-button").click();
    await expect(page.getByTestId("leave-card").nth(0)).toContainText("معتمدة");
    await expect(page.getByTestId("leave-card").nth(0)).toContainText("admin@school.local");

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("leave-card").nth(1).getByTestId("leave-reject-button").click();
    await expect(page.getByTestId("leave-card").nth(1)).toContainText("مرفوضة");
    await expect(page.getByTestId("leave-card").nth(1)).toContainText("admin@school.local");

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("leave-card").nth(2).getByTestId("leave-cancel-button").click();
    await expect(page.getByTestId("leave-card").nth(2)).toContainText("ملغية");
    await expect(page.getByTestId("leave-card").nth(2)).not.toContainText("admin@school.local");
  });

  test("shows approval error when available leave balance is insufficient", async ({
    page,
  }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeLeavesCrud);

    const employees = buildEmployeeFixtures(1);

    await mockCrudList({
      page,
      urlPattern: "**/backend/employee-leaves**",
      initialItems: [
        buildEmployeeLeaveListItem(employees[0], {
          id: "leave-insufficient-balance",
          status: "PENDING",
          approvedAt: null,
          totalDays: 5,
        }),
      ],
    });

    await page.route("**/backend/employee-leaves/leave-insufficient-balance/approve", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: 400,
          message:
            "Insufficient leave balance for approval. Remaining days: 2, requested days: 5",
        }),
      });
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-leaves",
      heading: "طلبات الإجازات",
    });

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("leave-card").first().getByTestId("leave-approve-button").click();

    await expectValidationMessage(
      page,
      "Insufficient leave balance for approval. Remaining days: 2, requested days: 5",
    );
    await expect(page.getByTestId("leave-card").first()).toContainText("قيد الانتظار");
  });

  test("validates required start date before sending request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeLeavesCrud);

    const employees = buildEmployeeFixtures(1);

    const leavesApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employee-leaves**",
      initialItems: [],
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-leaves",
      heading: "طلبات الإجازات",
    });

    await page
      .getByRole("button", { name: "إنشاء طلب إجازة" })
      .evaluate((element) => (element as HTMLButtonElement).click());

    await fillEmployeeLeaveForm(page, {
      employeeId: "emp-1",
      endDate: "2026-04-12",
      submit: true,
    });

    await expectValidationMessage(page, "تاريخ بداية الإجازة مطلوب.");
    expect(leavesApi.getPostCount()).toBe(0);
  });
});
