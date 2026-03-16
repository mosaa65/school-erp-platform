import { expect, test } from "@playwright/test";
import { mockEmployeesOptions, mockSummaryEndpoint } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { buildEmployeeFixtures } from "./helpers/fixtures";
import { buildHrSummaryReportResponse } from "./helpers/list-item-builders";
import { e2ePermissionSets } from "./helpers/permissions";
import { openModulePage } from "./helpers/ui-assertions";

test.describe("HR Reports", () => {
  test("loads HR summary and applies filters", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.hrReportsRead);

    const employees = buildEmployeeFixtures(2);
    await mockEmployeesOptions(page, employees);
    const summaryApi = await mockSummaryEndpoint(
      page,
      "**/backend/hr-reports/summary**",
      buildHrSummaryReportResponse(),
    );

    await openModulePage({
      page,
      path: "/app/hr-reports",
      heading: "تقارير الموارد البشرية",
    });

    await expect(page.getByTestId("hr-report-employees-card")).toBeVisible();
    await expect(page.getByTestId("hr-report-attendance-card")).toBeVisible();
    await expect(page.getByTestId("hr-report-violations-card")).toBeVisible();
    await expect(page.getByText(/(?:Total|الإجمالي):\s*10/)).toBeVisible();

    await page.getByTestId("hr-report-filter-employee").selectOption("emp-1");
    await page.getByTestId("hr-report-filter-from-date").fill("2026-01-01");
    await page.getByTestId("hr-report-filter-to-date").fill("2026-12-31");
    await page.getByTestId("hr-report-filters-submit").click();

    await expect
      .poll(() => summaryApi.getCalls(), {
        timeout: 7000,
      })
      .toBeGreaterThanOrEqual(2);
  });
});
