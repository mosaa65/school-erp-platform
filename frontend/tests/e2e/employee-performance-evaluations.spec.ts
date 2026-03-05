import { expect, test } from "@playwright/test";
import {
  mockAcademicYearsOptions,
  mockEmployeesOptions,
  mockListWithPost,
} from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import {
  buildAcademicYearFixtures,
  buildEmployeeFixtures,
} from "./helpers/fixtures";
import { fillEmployeePerformanceEvaluationForm } from "./helpers/form-actions";
import {
  buildCreatedEmployeePerformanceEvaluationFromPayload,
  buildEmployeePerformanceEvaluationListItem,
} from "./helpers/list-item-builders";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectTextVisible,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

test.describe("Employee Performance Evaluations", () => {
  test("loads list and creates a new evaluation", async ({ page }) => {
    await injectAuthSession(
      page,
      e2ePermissionSets.employeePerformanceEvaluationsCrud,
    );

    const employees = buildEmployeeFixtures(2);
    const years = buildAcademicYearFixtures(1);

    const evaluationsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-performance-evaluations**",
      initialItems: [
        buildEmployeePerformanceEvaluationListItem(
          employees[0],
          employees[1],
          years[0],
        ),
      ],
      onCreate: (payload) =>
        buildCreatedEmployeePerformanceEvaluationFromPayload(
          payload,
          employees,
          years,
          { ratingLevel: "EXCELLENT" },
        ),
    });
    await mockEmployeesOptions(page, employees);
    await mockAcademicYearsOptions(page, years);

    await openModulePage({
      page,
      path: "/app/employee-performance-evaluations",
      heading: "تقييمات الأداء",
      headingExact: true,
    });
    await expectCardsCount(page, "evaluation-card", 1);

    await fillEmployeePerformanceEvaluationForm(page, {
      employeeId: "emp-1",
      academicYearId: "year-1",
      evaluationDate: "2026-02-24",
      score: "95",
      evaluatorEmployeeId: "emp-2",
      strengths: "Excellent leadership",
      recommendations: "Promote as lead trainer",
      submit: true,
    });

    await expectCardsCount(page, "evaluation-card", 2);
    await expectTextVisible(page, "الدرجة: 95");

    const lastCreatePayload = evaluationsApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["score"]).toBe(95);
    expect(lastCreatePayload?.["employeeId"]).toBe("emp-1");
    expect(lastCreatePayload?.["academicYearId"]).toBe("year-1");
  });

  test("prevents submit when manual rating conflicts with score", async ({ page }) => {
    await injectAuthSession(
      page,
      e2ePermissionSets.employeePerformanceEvaluationsCrud,
    );

    const employees = buildEmployeeFixtures(1);
    const years = buildAcademicYearFixtures(1);

    await mockEmployeesOptions(page, employees);
    await mockAcademicYearsOptions(page, years);
    await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-performance-evaluations**",
      initialItems: [],
    });

    await openModulePage({
      page,
      path: "/app/employee-performance-evaluations",
      heading: "تقييمات الأداء",
      headingExact: true,
    });

    await fillEmployeePerformanceEvaluationForm(page, {
      employeeId: "emp-1",
      academicYearId: "year-1",
      evaluationDate: "2026-02-24",
      score: "95",
      ratingLevel: "GOOD",
    });

    await expectValidationMessage(
      page,
      "مستوى التقييم الحالي لا يطابق الدرجة. المتوقع: ممتاز.",
    );
    await expect(page.getByTestId("evaluation-form-submit")).toBeDisabled();
  });
});
