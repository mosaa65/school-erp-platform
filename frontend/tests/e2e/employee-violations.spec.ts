import { expect, test } from "@playwright/test";
import { mockEmployeesOptions, mockListWithPost } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { buildEmployeeFixtures } from "./helpers/fixtures";
import { fillEmployeeViolationForm } from "./helpers/form-actions";
import {
  buildCreatedEmployeeViolationFromPayload,
  buildEmployeeViolationListItem,
} from "./helpers/list-item-builders";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

test.describe("Employee Violations", () => {
  test("requires action taken for critical violations then creates successfully", async ({
    page,
  }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeViolationsCrud);

    const employees = buildEmployeeFixtures(2);

    const violationsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-violations**",
      initialItems: [buildEmployeeViolationListItem(employees[0], employees[1])],
      onCreate: (payload, context) =>
        buildCreatedEmployeeViolationFromPayload(payload, employees, {
          id: `vio-${context.postCount + 1}`,
        }),
    });
    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-violations",
      heading: "مخالفات الموظفين",
    });
    await expectCardsCount(page, "violation-card", 1);

    await fillEmployeeViolationForm(page, {
      employeeId: "emp-1",
      violationDate: "2026-02-24",
      violationAspect: "Exam paper leakage",
      violationText: "Shared confidential content",
      severity: "CRITICAL",
      reportedByEmployeeId: "emp-2",
      submit: true,
    });
    await expectValidationMessage(page, "الإجراء المتخذ مطلوب للمخالفات العالية والحرجة.");
    expect(violationsApi.getPostCount()).toBe(0);

    await fillEmployeeViolationForm(page, {
      actionTaken: "Immediate suspension",
      submit: true,
    });

    await expectCardsCount(page, "violation-card", 2);
    await expect(page.getByTestId("violation-card").first().getByText("حرجة")).toBeVisible();
    expect(violationsApi.getPostCount()).toBe(1);
    expect(violationsApi.getLastCreatePayload()?.["severity"]).toBe("CRITICAL");
  });

  test("validates filters date range before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeViolationsCrud);

    const violationsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-violations**",
      initialItems: [],
    });
    await mockEmployeesOptions(page, buildEmployeeFixtures(0));

    await openModulePage({
      page,
      path: "/app/employee-violations",
      heading: "مخالفات الموظفين",
    });
    await expect(page.getByTestId("violation-filters-form")).toBeVisible();

    await page.getByTestId("violation-filter-from-date").fill("2026-12-31");
    await page.getByTestId("violation-filter-to-date").fill("2026-01-01");
    await page.getByTestId("violation-filters-submit").click();

    await expectValidationMessage(
      page,
      "تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية.",
    );
    expect(violationsApi.getGetCount()).toBe(1);
  });
});
