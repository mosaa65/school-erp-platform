import { expect, test } from "@playwright/test";
import { mockCrudList, mockEmployeesOptions } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { buildEmployeeFixtures } from "./helpers/fixtures";
import { fillEmployeeLeaveBalanceForm } from "./helpers/form-actions";
import { buildEmployeeLeaveBalanceListItem } from "./helpers/list-item-builders";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

test.describe("Employee Leave Balances", () => {
  test("loads list and creates a new leave balance", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeLeaveBalancesCrud);

    const employees = buildEmployeeFixtures(2);

    const balancesApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employee-leave-balances**",
      initialItems: [buildEmployeeLeaveBalanceListItem(employees[0])],
      onCreate: (payload) => {
        const employee =
          employees.find((item) => item.id === payload["employeeId"]) ?? employees[0];
        const allocatedDays = Number(payload["allocatedDays"] ?? 24);
        const carriedForwardDays = Number(payload["carriedForwardDays"] ?? 4);
        const manualAdjustmentDays = Number(payload["manualAdjustmentDays"] ?? -1);
        const totalEntitledDays =
          allocatedDays + carriedForwardDays + manualAdjustmentDays;
        const usedDays = 6;

        return buildEmployeeLeaveBalanceListItem(employee, {
          id: "leave-balance-2",
          employeeId: String(payload["employeeId"] ?? employee.id),
          leaveType: String(payload["leaveType"] ?? "ANNUAL"),
          balanceYear: Number(payload["balanceYear"] ?? 2026),
          allocatedDays,
          carriedForwardDays,
          manualAdjustmentDays,
          totalEntitledDays,
          usedDays,
          remainingDays: totalEntitledDays - usedDays,
          notes: payload["notes"] === undefined ? null : String(payload["notes"]),
        });
      },
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-leave-balances",
      heading: "أرصدة الإجازات",
    });

    await expectCardsCount(page, "leave-balance-card", 1);

    await page
      .getByRole("button", { name: "إضافة رصيد إجازة" })
      .evaluate((element) => (element as HTMLButtonElement).click());

    await fillEmployeeLeaveBalanceForm(page, {
      employeeId: "emp-2",
      leaveType: "SICK",
      balanceYear: "2026",
      allocatedDays: "24",
      carriedForwardDays: "4",
      manualAdjustmentDays: "-1",
      notes: "Carry forward approved",
      submit: true,
    });

    await expectCardsCount(page, "leave-balance-card", 2);
    await expect(page.getByText("Carry forward approved")).toBeVisible();

    const lastCreatePayload = balancesApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["employeeId"]).toBe("emp-2");
    expect(lastCreatePayload?.["leaveType"]).toBe("SICK");
    expect(lastCreatePayload?.["balanceYear"]).toBe(2026);
  });

  test("validates required allocated days before sending request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeLeaveBalancesCrud);

    const employees = buildEmployeeFixtures(1);

    const balancesApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employee-leave-balances**",
      initialItems: [],
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-leave-balances",
      heading: "أرصدة الإجازات",
    });

    await page
      .getByRole("button", { name: "إضافة رصيد إجازة" })
      .evaluate((element) => (element as HTMLButtonElement).click());

    await fillEmployeeLeaveBalanceForm(page, {
      employeeId: "emp-1",
      balanceYear: "2026",
      submit: true,
    });

    await expectValidationMessage(page, "عدد الأيام المخصصة مطلوب ويجب أن يكون رقمًا غير سالب.");
    expect(balancesApi.getPostCount()).toBe(0);
  });

  test("generates annual leave balances from defaults", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeLeaveBalancesCrud);

    const employees = buildEmployeeFixtures(2);

    await mockCrudList({
      page,
      urlPattern: "**/backend/employee-leave-balances**",
      initialItems: [buildEmployeeLeaveBalanceListItem(employees[0])],
    });

    await page.route("**/backend/employee-leave-balances/generate", async (route) => {
      const request = route.request();
      const body = request.postDataJSON() as Record<string, unknown>;

      expect(body["balanceYear"]).toBe(2026);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          balanceYear: 2026,
          employeesScanned: 2,
          generatedCount: 5,
          skippedExistingCount: 1,
          leaveTypes: ["ANNUAL", "SICK", "EMERGENCY", "MATERNITY"],
        }),
      });
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-leave-balances",
      heading: "أرصدة الإجازات",
    });

    await page.getByTestId("generate-leave-balances").click();
    await expect(page.getByTestId("leave-balance-generation-message")).toContainText(
      "تم فحص 2 موظفًا وإنشاء 5 رصيدًا، مع تخطي 1 سجلًا موجودًا لسنة 2026.",
    );
  });
});
