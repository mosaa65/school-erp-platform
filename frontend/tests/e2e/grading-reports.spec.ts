import { expect, test } from "@playwright/test";
import {
  mockSummaryEndpoint,
  mockAcademicTermsOptions,
  mockAcademicYearsOptions,
  mockGradeLevelsOptions,
  mockSectionsOptions,
} from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import {
  buildAcademicTermFixtures,
  buildAcademicYearFixtures,
  buildGradeLevelFixtures,
  buildSectionFixtures,
} from "./helpers/fixtures";
import {
  buildGradingDetailedReportList,
  buildGradingSummaryReportResponse,
} from "./helpers/list-item-builders";
import { e2ePermissionSets } from "./helpers/permissions";
import { openModulePage } from "./helpers/ui-assertions";

test.describe("Grading Reports", () => {
  test("loads grading summary and applies filters", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.gradingReportsRead);

    const years = buildAcademicYearFixtures(1);
    const gradeLevels = buildGradeLevelFixtures(1);
    const sections = buildSectionFixtures(1);
    const terms = buildAcademicTermFixtures(1);

    await mockAcademicYearsOptions(page, years);
    await mockGradeLevelsOptions(page, gradeLevels);
    await mockSectionsOptions(page, sections);
    await mockAcademicTermsOptions(page, terms);
    const summaryApi = await mockSummaryEndpoint(
      page,
      "**/backend/grading-reports/summary**",
      buildGradingSummaryReportResponse(),
    );
    const detailsApi = await mockSummaryEndpoint(
      page,
      "**/backend/grading-reports/details**",
      {
        data: buildGradingDetailedReportList(),
        pagination: {
          page: 1,
          limit: 12,
          total: 1,
          totalPages: 1,
        },
      },
    );

    await openModulePage({
      page,
      path: "/app/grading-reports",
      heading: "تقارير الدرجات",
    });

    await expect(page.getByTestId("grading-report-semester-card")).toBeVisible();
    await expect(page.getByTestId("grading-report-annual-grades-card")).toBeVisible();
    await expect(page.getByTestId("grading-report-annual-results-card")).toBeVisible();
    await expect(page.getByTestId("grading-report-details-card")).toBeVisible();
    await expect(page.getByTestId("grading-report-detail-item")).toHaveCount(1);
    await expect(page.getByText(/(?:Total|الإجمالي):\s*20/).first()).toBeVisible();

    await page.getByTestId("grading-report-filter-search").fill("طالب");
    await page.getByTestId("grading-report-filter-year").selectOption("year-1");
    await page.getByTestId("grading-report-filter-grade").selectOption("grade-1");
    await page.getByTestId("grading-report-filter-section").selectOption("sec-1");
    await page.getByTestId("grading-report-filter-term").selectOption("term-1");
    await page.getByTestId("grading-report-filter-from-date").fill("2025-09-01");
    await page.getByTestId("grading-report-filter-to-date").fill("2025-12-31");
    await page.getByTestId("grading-report-filters-submit").click();

    await expect
      .poll(() => summaryApi.getCalls(), {
        timeout: 7000,
      })
      .toBeGreaterThanOrEqual(2);
    await expect
      .poll(() => detailsApi.getCalls(), {
        timeout: 7000,
      })
      .toBeGreaterThanOrEqual(2);
  });
});
