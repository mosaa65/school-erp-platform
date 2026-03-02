import { expect, test } from "@playwright/test";
import {
  mockAcademicTermsOptions,
  mockAcademicYearsOptions,
  mockListWithPost,
} from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import {
  buildAcademicTermFixtures,
  buildAcademicYearFixtures,
} from "./helpers/fixtures";
import { fillAcademicMonthForm } from "./helpers/form-actions";
import {
  buildAcademicMonthListItem,
  buildCreatedAcademicMonthFromPayload,
} from "./helpers/list-item-builders";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

test.describe("Academic Months", () => {
  test("loads list and creates a new academic month", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.academicMonthsCrud);

    const years = buildAcademicYearFixtures(1);
    const terms = buildAcademicTermFixtures(2);

    const monthsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/academic-months**",
      initialItems: [buildAcademicMonthListItem(years[0], terms[0])],
      onCreate: (payload) => buildCreatedAcademicMonthFromPayload(payload, years, terms),
    });
    await mockAcademicYearsOptions(page, years);
    await mockAcademicTermsOptions(page, terms);

    await openModulePage({
      page,
      path: "/app/academic-months",
      heading: "الأشهر الأكاديمية",
    });
    await expectCardsCount(page, "academic-month-card", 1);

    await fillAcademicMonthForm(page, {
      academicYearId: "year-1",
      academicTermId: "term-1",
      code: "M2",
      name: "Month 2 - October",
      sequence: "2",
      startDate: "2025-10-01",
      endDate: "2025-10-31",
      status: "DRAFT",
      submit: true,
    });

    await expectCardsCount(page, "academic-month-card", 2);
    await expect(
      page.getByTestId("academic-month-card").first().getByText("Month 2 - October"),
    ).toBeVisible();

    const lastCreatePayload = monthsApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["academicYearId"]).toBe("year-1");
    expect(lastCreatePayload?.["academicTermId"]).toBe("term-1");
    expect(lastCreatePayload?.["sequence"]).toBe(2);
  });

  test("validates month range must be within selected term", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.academicMonthsCrud);

    const years = buildAcademicYearFixtures(1);
    const terms = buildAcademicTermFixtures(1);

    const monthsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/academic-months**",
      initialItems: [],
    });
    await mockAcademicYearsOptions(page, years);
    await mockAcademicTermsOptions(page, terms);

    await openModulePage({
      page,
      path: "/app/academic-months",
      heading: "الأشهر الأكاديمية",
    });

    await fillAcademicMonthForm(page, {
      academicYearId: "year-1",
      academicTermId: "term-1",
      code: "M-OUT",
      name: "Out of term range",
      sequence: "5",
      startDate: "2026-02-01",
      endDate: "2026-02-28",
      submit: true,
    });

    await expectValidationMessage(
      page,
      "نطاق الشهر يجب أن يكون ضمن نطاق الفصل الأكاديمي المختار.",
    );
    expect(monthsApi.getPostCount()).toBe(0);
  });
});
