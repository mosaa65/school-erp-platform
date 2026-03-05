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
  buildGradeLevelFixtures,
  buildSubjectFixtures,
} from "./helpers/fixtures";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectTextVisible,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

type GradeLevelSubjectListItem = {
  id: string;
  academicYearId: string;
  gradeLevelId: string;
  subjectId: string;
  isMandatory: boolean;
  weeklyPeriods: number;
  displayOrder: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: string;
    isCurrent: boolean;
  };
  gradeLevel: {
    id: string;
    code: string;
    name: string;
    stage: string;
    sequence: number;
    isActive: boolean;
  };
  subject: {
    id: string;
    code: string;
    name: string;
    shortName: string | null;
    category: string;
    isActive: boolean;
  };
};

type TermSubjectOfferingListItem = {
  id: string;
  academicTermId: string;
  gradeLevelSubjectId: string;
  weeklyPeriods: number;
  displayOrder: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  academicTerm: {
    id: string;
    code: string;
    name: string;
    sequence: number;
    academicYearId: string;
    isActive: boolean;
  };
  gradeLevelSubject: GradeLevelSubjectListItem;
};

function buildGradeLevelSubject(
  year: {
    id: string;
    code: string;
    name: string;
    status: string;
    isCurrent: boolean;
  },
  grade: {
    id: string;
    code: string;
    name: string;
    stage: string;
    sequence: number;
    isActive: boolean;
  },
  subject: {
    id: string;
    code: string;
    name: string;
    category: string;
    isActive: boolean;
  },
): GradeLevelSubjectListItem {
  return {
    id: "gls-1",
    academicYearId: year.id,
    gradeLevelId: grade.id,
    subjectId: subject.id,
    isMandatory: true,
    weeklyPeriods: 5,
    displayOrder: 1,
    isActive: true,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    academicYear: year,
    gradeLevel: grade,
    subject: {
      ...subject,
      shortName: null,
    },
  };
}

function buildOffering(
  term: {
    id: string;
    code: string;
    name: string;
    sequence: number;
    academicYearId: string;
    isActive: boolean;
  },
  mapping: GradeLevelSubjectListItem,
  overrides: Partial<TermSubjectOfferingListItem> = {},
): TermSubjectOfferingListItem {
  return {
    id: overrides.id ?? "off-1",
    academicTermId: overrides.academicTermId ?? term.id,
    gradeLevelSubjectId: overrides.gradeLevelSubjectId ?? mapping.id,
    weeklyPeriods: overrides.weeklyPeriods ?? 5,
    displayOrder: overrides.displayOrder ?? 1,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-03-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-03-01T00:00:00.000Z",
    academicTerm: term,
    gradeLevelSubject: mapping,
  };
}

test.describe("Term Subject Offerings", () => {
  test("loads list and creates a new offering", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.termSubjectOfferingsCrud);

    const years = buildAcademicYearFixtures(1);
    const terms = buildAcademicTermFixtures(1);
    const grades = buildGradeLevelFixtures(1);
    const subjects = buildSubjectFixtures(1);

    const year = years[0];
    const term = terms[0];
    const grade = grades[0];
    const subject = subjects[0];
    const mapping = buildGradeLevelSubject(year, grade, subject);

    const offeringsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/term-subject-offerings**",
      initialItems: [buildOffering(term, mapping)],
      onCreate: (payload) => {
        return buildOffering(term, mapping, {
          id: "off-2",
          academicTermId:
            typeof payload.academicTermId === "string"
              ? payload.academicTermId
              : term.id,
          gradeLevelSubjectId:
            typeof payload.gradeLevelSubjectId === "string"
              ? payload.gradeLevelSubjectId
              : mapping.id,
          weeklyPeriods:
            typeof payload.weeklyPeriods === "number" ? payload.weeklyPeriods : 1,
          displayOrder:
            typeof payload.displayOrder === "number" ? payload.displayOrder : null,
          isActive:
            payload.isActive === undefined ? true : Boolean(payload.isActive),
          createdAt: "2026-03-02T00:00:00.000Z",
          updatedAt: "2026-03-02T00:00:00.000Z",
        });
      },
    });

    await mockAcademicYearsOptions(page, years);
    await mockAcademicTermsOptions(page, terms);
    await page.route("**/backend/grade-level-subjects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [mapping],
          pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
        }),
      });
    });

    await openModulePage({
      page,
      path: "/app/term-subject-offerings",
      heading: "عروض المواد للفصول",
    });
    await expectCardsCount(page, "offering-card", 1);

    await page.getByTestId("offering-form-term").selectOption(term.id);
    await page.getByTestId("offering-form-mapping").selectOption(mapping.id);
    await page.getByTestId("offering-form-weekly-periods").fill("6");
    await page.getByTestId("offering-form-display-order").fill("2");
    await page.getByTestId("offering-form-submit").click();

    await expectCardsCount(page, "offering-card", 2);
    await expectTextVisible(page, "الحصص الأسبوعية: 6 | ترتيب العرض: 2");

    const lastCreatePayload = offeringsApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["academicTermId"]).toBe(term.id);
    expect(lastCreatePayload?.["gradeLevelSubjectId"]).toBe(mapping.id);
    expect(lastCreatePayload?.["weeklyPeriods"]).toBe(6);
    expect(lastCreatePayload?.["displayOrder"]).toBe(2);
  });

  test("validates required mapping before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.termSubjectOfferingsCrud);

    const years = buildAcademicYearFixtures(1);
    const terms = buildAcademicTermFixtures(1);
    const grades = buildGradeLevelFixtures(1);
    const subjects = buildSubjectFixtures(1);
    const mapping = buildGradeLevelSubject(years[0], grades[0], subjects[0]);

    const offeringsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/term-subject-offerings**",
      initialItems: [],
    });

    await mockAcademicYearsOptions(page, years);
    await mockAcademicTermsOptions(page, terms);
    await page.route("**/backend/grade-level-subjects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [mapping],
          pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
        }),
      });
    });

    await openModulePage({
      page,
      path: "/app/term-subject-offerings",
      heading: "عروض المواد للفصول",
    });

    await page.getByTestId("offering-form-term").selectOption(terms[0].id);
    await page.getByTestId("offering-form-submit").click();

    await expectValidationMessage(
      page,
      "الحقول الأساسية مطلوبة: الفصل الأكاديمي وربط الصف مع المادة.",
    );
    expect(offeringsApi.getPostCount()).toBe(0);
  });
});
