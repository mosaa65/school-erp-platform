import { expect, test } from "@playwright/test";
import {
  mockAcademicYearsOptions,
  mockGradeLevelsOptions,
  mockListWithPost,
  mockSubjectsOptions,
} from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import {
  buildAcademicYearFixtures,
  buildGradeLevelFixtures,
  buildSubjectFixtures,
} from "./helpers/fixtures";
import { fillGradingPolicyForm } from "./helpers/form-actions";
import {
  buildCreatedGradingPolicyFromPayload,
  buildGradingPolicyListItem,
} from "./helpers/list-item-builders";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

test.describe("Grading Policies", () => {
  test("loads list and creates a new grading policy", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.gradingPoliciesCrud);

    const years = buildAcademicYearFixtures(1);
    const gradeLevels = buildGradeLevelFixtures(1);
    const subjects = buildSubjectFixtures(1);

    const policiesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/grading-policies**",
      initialItems: [buildGradingPolicyListItem(years[0], gradeLevels[0], subjects[0])],
      onCreate: (payload) =>
        buildCreatedGradingPolicyFromPayload(payload, years, gradeLevels, subjects),
    });
    await mockAcademicYearsOptions(page, years);
    await mockGradeLevelsOptions(page, gradeLevels);
    await mockSubjectsOptions(page, subjects);

    await openModulePage({
      page,
      path: "/app/grading-policies",
      heading: "سياسات الدرجات",
    });
    await expectCardsCount(page, "grading-policy-card", 1);

    await fillGradingPolicyForm(page, {
      academicYearId: "year-1",
      gradeLevelId: "grade-1",
      subjectId: "subj-1",
      assessmentType: "FINAL",
      maxExamScore: "40",
      maxHomeworkScore: "10",
      maxAttendanceScore: "5",
      maxActivityScore: "5",
      maxContributionScore: "0",
      passingScore: "60",
      status: "APPROVED",
      submit: true,
    });

    await expectCardsCount(page, "grading-policy-card", 2);
    await expect(page.getByTestId("grading-policy-card").first().getByText("نهائي")).toBeVisible();

    const lastCreatePayload = policiesApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["assessmentType"]).toBe("FINAL");
    expect(lastCreatePayload?.["passingScore"]).toBe(60);
  });

  test("validates required references before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.gradingPoliciesCrud);

    const years = buildAcademicYearFixtures(1);
    const gradeLevels = buildGradeLevelFixtures(1);
    const subjects = buildSubjectFixtures(1);

    const policiesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/grading-policies**",
      initialItems: [],
    });
    await mockAcademicYearsOptions(page, years);
    await mockGradeLevelsOptions(page, gradeLevels);
    await mockSubjectsOptions(page, subjects);

    await openModulePage({
      page,
      path: "/app/grading-policies",
      heading: "سياسات الدرجات",
    });

    await fillGradingPolicyForm(page, {
      passingScore: "60",
      submit: true,
    });

    await expectValidationMessage(page, "الحقول الأساسية مطلوبة: السنة والصف والمادة.");
    expect(policiesApi.getPostCount()).toBe(0);
  });
});
