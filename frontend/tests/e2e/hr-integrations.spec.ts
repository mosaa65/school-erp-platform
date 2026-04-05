import { expect, test } from "@playwright/test";
import { injectAuthSession } from "./helpers/auth-session";
import { buildEmployeeFixtures } from "./helpers/fixtures";
import { e2ePermissionSets } from "./helpers/permissions";
import { openModulePage } from "./helpers/ui-assertions";

test.describe("HR Integrations", () => {
  test("blocks users without finance HR permissions", async ({ page }) => {
    await injectAuthSession(page, ["employees.read"]);

    await page.goto("/app/hr-integrations");

    await expect(page.getByText("403 - غير مصرح")).toBeVisible();
    await expect(
      page.getByText(
        "finance-hr.payroll-summary | finance-hr.payroll-journal | finance-hr.deduction-journal",
      ),
    ).toBeVisible();
  });

  test("shows HR integrations in navigation and finance shortcuts for deduction-only users", async ({
    page,
  }) => {
    await injectAuthSession(page, e2ePermissionSets.hrDeductionOnly);
    const employees = buildEmployeeFixtures(1);

    await page.route("**/backend/employees**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: employees,
          pagination: {
            page: 1,
            limit: 100,
            total: employees.length,
            totalPages: 1,
          },
        }),
      });
    });

    await openModulePage({
      page,
      path: "/app/finance",
      heading: "النظام المالي",
      headingLevel: 1,
    });

    const hrIntegrationsLinks = page.getByRole("link", {
      name: "تكاملات الموارد البشرية",
    });

    await expect(hrIntegrationsLinks).toHaveCount(2);

    await hrIntegrationsLinks.first().click();
    await page.waitForURL("**/app/hr-integrations");

    await expect(
      page.getByRole("main").getByRole("heading", {
        name: "تكاملات الموارد البشرية",
        level: 1,
      }),
    ).toBeVisible();
  });

  test("creates an employee deduction using the employee selector", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.hrIntegrationsManage);

    const employees = buildEmployeeFixtures(2);
    let deductionPayload: Record<string, unknown> | null = null;

    await page.route("**/backend/employees**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: employees,
          pagination: {
            page: 1,
            limit: 100,
            total: employees.length,
            totalPages: 1,
          },
        }),
      });
    });

    await page.route("**/backend/finance/hr/deduction-journal", async (route) => {
      deductionPayload = JSON.parse(route.request().postData() ?? "{}") as Record<
        string,
        unknown
      >;

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          journalEntryId: "je-hr-1",
          entryNumber: "JE-2026-0012",
          amount: 1250,
        }),
      });
    });

    await openModulePage({
      page,
      path: "/app/hr-integrations",
      heading: "تكاملات الموارد البشرية",
      headingLevel: 1,
    });

    await page.getByTestId("hr-deduction-employee").selectOption("emp-2");
    await page.getByTestId("hr-deduction-amount").fill("1250");
    await page.getByTestId("hr-deduction-reason").fill("خصم تأخير");
    await page.getByTestId("hr-deduction-submit").click();

    await expect(page.getByTestId("hr-integrations-log")).toHaveCount(1);
    await expect(page.getByText("تم إنشاء القيد رقم JE-2026-0012")).toBeVisible();

    if (!deductionPayload) {
      throw new Error("Deduction payload was not captured.");
    }

    const payload = deductionPayload;
    expect(String(payload["employeeId"])).toBe("emp-2");
    expect(Number(payload["amount"])).toBe(1250);
    expect(String(payload["reason"])).toBe("خصم تأخير");
  });

  test("previews payroll automatically and fills journal totals", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.hrIntegrationsManage);

    const employees = buildEmployeeFixtures(2);
    let previewRequestUrl = "";
    let payrollPayload: Record<string, unknown> | null = null;

    await page.route("**/backend/employees**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: employees,
          pagination: {
            page: 1,
            limit: 100,
            total: employees.length,
            totalPages: 1,
          },
        }),
      });
    });

    await page.route("**/backend/finance/hr/payroll-preview/*", async (route) => {
      previewRequestUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          month: 4,
          year: 2026,
          branchId: null,
          totals: {
            grossSalaries: 100000,
            estimatedDeductions: 8000,
            estimatedNetSalaries: 92000,
          },
          assumptions: {
            daysInMonth: 30,
            deductionSource: "APPROVED_UNPAID_LEAVES",
            contractsIncluded: 12,
            employeesIncluded: 10,
            employeesWithUnpaidLeave: 3,
            totalUnpaidLeaveDays: 24,
          },
          recommendedJournal: {
            month: 4,
            year: 2026,
            totalSalaries: 100000,
            totalDeductions: 8000,
            netSalaries: 92000,
            description: "قيد رواتب تقديري 4/2026",
          },
          employeeBreakdown: [
            {
              employeeId: "emp-1",
              employeeName: "موظف تجريبي 1",
              jobNumber: "JOB-0001",
              branchId: 1,
              grossSalary: 10000,
              activeDays: 30,
              unpaidLeaveDays: 2,
              estimatedDeductions: 666.67,
              estimatedNetSalary: 9333.33,
            },
          ],
        }),
      });
    });

    await page.route("**/backend/finance/hr/payroll-journal", async (route) => {
      payrollPayload = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          journalEntryId: "je-hr-payroll-1",
          entryNumber: "JE-2026-0100",
          totalSalaries: 100000,
          totalDeductions: 8000,
          netSalaries: 92000,
        }),
      });
    });

    await openModulePage({
      page,
      path: "/app/hr-integrations",
      heading: "تكاملات الموارد البشرية",
      headingLevel: 1,
    });

    await page.getByTestId("hr-payroll-month").fill("4");
    await page.getByTestId("hr-payroll-year").fill("2026");
    await page.getByTestId("hr-payroll-preview").click();

    await expect(page.getByTestId("hr-payroll-preview-card")).toBeVisible();
    await expect(page.getByTestId("hr-payroll-total-salaries")).toHaveValue("100000.00");
    await expect(page.getByTestId("hr-payroll-total-deductions")).toHaveValue("8000.00");
    await expect(page.getByTestId("hr-payroll-description")).toHaveValue("قيد رواتب تقديري 4/2026");

    expect(previewRequestUrl).toContain("/finance/hr/payroll-preview/4");
    expect(previewRequestUrl).toContain("year=2026");

    await page.getByTestId("hr-payroll-submit").click();
    await expect(page.getByText("تم إنشاء القيد رقم JE-2026-0100")).toBeVisible();

    if (!payrollPayload) {
      throw new Error("Payroll payload was not captured.");
    }

    expect(Number(payrollPayload["totalSalaries"])).toBe(100000);
    expect(Number(payrollPayload["totalDeductions"])).toBe(8000);
    expect(Number(payrollPayload["month"])).toBe(4);
    expect(Number(payrollPayload["year"])).toBe(2026);
  });
});
