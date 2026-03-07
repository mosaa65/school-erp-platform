import { expect, test, type Page } from "@playwright/test";
import {
  mockAcademicTermsOptions,
  mockAcademicYearsOptions,
  mockListWithPost,
  mockSectionsOptions,
  mockSubjectsOptions,
} from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import {
  buildAcademicTermFixtures,
  buildAcademicYearFixtures,
  buildSectionFixtures,
  buildSubjectFixtures,
} from "./helpers/fixtures";
import { openModulePage } from "./helpers/ui-assertions";

const HOMEWORKS_CRUD_PERMISSIONS = [
  "homeworks.read",
  "homeworks.create",
  "homeworks.update",
  "homeworks.delete",
  "academic-years.read",
  "academic-terms.read",
  "sections.read",
  "subjects.read",
  "homework-types.read",
] as const;

type HomeworkTypeOption = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}

async function mockHomeworkTypesOptions(page: Page) {
  const homeworkTypes: HomeworkTypeOption[] = [
    {
      id: "hw-type-1",
      code: "HOMEWORK",
      name: "واجب منزلي",
      isActive: true,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    },
  ];

  await page.route("**/backend/homework-types**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: homeworkTypes,
        pagination: {
          page: 1,
          limit: 100,
          total: homeworkTypes.length,
          totalPages: 1,
        },
      }),
    });
  });
}

test.describe("Homeworks Defaults", () => {
  test("prefills homework date to today and due date to +5 days", async ({ page }) => {
    await injectAuthSession(page, HOMEWORKS_CRUD_PERMISSIONS);

    const academicYears = buildAcademicYearFixtures(1);
    const academicTerms = buildAcademicTermFixtures(1);
    const sections = buildSectionFixtures(1);
    const subjects = buildSubjectFixtures(1);

    await mockListWithPost({
      page,
      urlPattern: "**/backend/homeworks**",
      initialItems: [],
    });

    await mockAcademicYearsOptions(page, academicYears);
    await mockAcademicTermsOptions(page, academicTerms);
    await mockSectionsOptions(page, sections);
    await mockSubjectsOptions(page, subjects);
    await mockHomeworkTypesOptions(page);

    await openModulePage({
      page,
      path: "/app/homeworks",
      heading: "الواجبات",
    });

    const expectedHomeworkDate = toDateInput(new Date());
    const expectedDueDate = addDays(expectedHomeworkDate, 5);

    const dateInputs = page.locator("input[type='date']");

    await expect(dateInputs.nth(0)).toHaveValue(expectedHomeworkDate);
    await expect(dateInputs.nth(1)).toHaveValue(expectedDueDate);
  });

  test("auto-adjusts due date only while still in default mode", async ({ page }) => {
    await injectAuthSession(page, HOMEWORKS_CRUD_PERMISSIONS);

    const academicYears = buildAcademicYearFixtures(1);
    const academicTerms = buildAcademicTermFixtures(1);
    const sections = buildSectionFixtures(1);
    const subjects = buildSubjectFixtures(1);

    await mockListWithPost({
      page,
      urlPattern: "**/backend/homeworks**",
      initialItems: [],
    });

    await mockAcademicYearsOptions(page, academicYears);
    await mockAcademicTermsOptions(page, academicTerms);
    await mockSectionsOptions(page, sections);
    await mockSubjectsOptions(page, subjects);
    await mockHomeworkTypesOptions(page);

    await openModulePage({
      page,
      path: "/app/homeworks",
      heading: "الواجبات",
    });

    const dateInputs = page.locator("input[type='date']");

    await dateInputs.nth(0).fill("2026-03-10");
    await expect(dateInputs.nth(1)).toHaveValue("2026-03-15");

    await dateInputs.nth(1).fill("2026-03-20");
    await dateInputs.nth(0).fill("2026-03-11");

    await expect(dateInputs.nth(1)).toHaveValue("2026-03-20");
  });
});

