import { expect, test, type Page, type Route } from "@playwright/test";
import { injectAuthSession } from "./helpers/auth-session";
import { openModulePage } from "./helpers/ui-assertions";

function listResponse<T>(data: T[]) {
  return {
    data,
    pagination: {
      page: 1,
      limit: 100,
      total: data.length,
      totalPages: data.length === 0 ? 1 : 1,
    },
  };
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockSectionOptions(page: Page) {
  const sections = [
    {
      id: "sec-1",
      code: "A",
      name: "الشعبة أ",
      gradeLevelId: "grade-1",
      isActive: true,
      gradeLevel: {
        id: "grade-1",
        code: "G1",
        name: "الصف الأول",
        stage: "PRIMARY",
        sequence: 1,
        isActive: true,
      },
    },
  ];

  await page.route("**/backend/sections**", async (route) => {
    await fulfillJson(route, listResponse(sections));
  });
}

async function mockSubjectOptions(page: Page) {
  await page.route("**/backend/subjects**", async (route) => {
    await fulfillJson(
      route,
      listResponse([
        {
          id: "subj-1",
          code: "MATH",
          name: "الرياضيات",
          category: "MATHEMATICS",
          isActive: true,
        },
      ]),
    );
  });
}

const system05SectionLabel = "الصف الأول (G1) / الشعبة أ (A)";

const system05Permissions = [
  "exam-assessments.read",
  "exam-periods.read",
  "sections.read",
  "subjects.read",
  "monthly-grades.read",
  "academic-months.read",
  "student-enrollments.read",
  "annual-grades.read",
  "annual-statuses.read",
  "academic-years.read",
];

test.describe("System 05 Section Labels", () => {
  async function expectSectionLabelOptionExists(page: Page) {
    await expect
      .poll(async () => {
        return page
          .locator("option")
          .filter({ hasText: system05SectionLabel })
          .count();
      })
      .toBeGreaterThan(0);
  }

  test("exam assessments page shows section options as grade/section", async ({
    page,
  }) => {
    await injectAuthSession(page, system05Permissions);

    await mockSectionOptions(page);
    await mockSubjectOptions(page);

    await page.route("**/backend/exam-periods**", async (route) => {
      await fulfillJson(
        route,
        listResponse([
          {
            id: "period-1",
            name: "فترة شهرية",
            assessmentType: "MONTHLY",
            status: "DRAFT",
            isLocked: false,
            startDate: "2026-09-01T00:00:00.000Z",
            endDate: "2026-09-30T23:59:59.000Z",
            academicYearId: "year-1",
            academicTermId: "term-1",
            academicYear: {
              id: "year-1",
              code: "2026-2027",
              name: "العام 2026-2027",
              status: "ACTIVE",
              isCurrent: true,
            },
            academicTerm: {
              id: "term-1",
              code: "T1",
              name: "الفصل الأول",
              sequence: 1,
              termType: "SEMESTER",
              isActive: true,
              academicYearId: "year-1",
            },
          },
        ]),
      );
    });

    await page.route("**/backend/exam-assessments**", async (route) => {
      await fulfillJson(route, listResponse([]));
    });

    await openModulePage({
      page,
      path: "/app/exam-assessments",
      heading: "الاختبارات",
    });

    await expectSectionLabelOptionExists(page);
  });

  test("monthly grades page shows section options as grade/section", async ({
    page,
  }) => {
    await injectAuthSession(page, system05Permissions);

    await mockSectionOptions(page);
    await mockSubjectOptions(page);

    await page.route("**/backend/academic-months**", async (route) => {
      await fulfillJson(
        route,
        listResponse([
          {
            id: "month-1",
            code: "M1",
            name: "محرم",
            sequence: 1,
            startDate: "2026-09-01T00:00:00.000Z",
            endDate: "2026-09-30T23:59:59.000Z",
            status: "APPROVED",
            isCurrent: true,
            isActive: true,
            academicYearId: "year-1",
            academicTermId: "term-1",
            academicYear: {
              id: "year-1",
              code: "2026-2027",
              name: "العام 2026-2027",
              status: "ACTIVE",
              isCurrent: true,
            },
            academicTerm: {
              id: "term-1",
              code: "T1",
              name: "الفصل الأول",
              sequence: 1,
              termType: "SEMESTER",
              isActive: true,
              academicYearId: "year-1",
            },
          },
        ]),
      );
    });

    await page.route("**/backend/student-enrollments**", async (route) => {
      await fulfillJson(
        route,
        listResponse([
          {
            id: "enr-1",
            studentId: "stu-1",
            academicYearId: "year-1",
            sectionId: "sec-1",
            enrollmentDate: "2026-09-01T00:00:00.000Z",
            status: "ENROLLED",
            notes: null,
            isActive: true,
            createdAt: "2026-09-01T00:00:00.000Z",
            updatedAt: "2026-09-01T00:00:00.000Z",
            createdBy: null,
            updatedBy: null,
            student: {
              id: "stu-1",
              admissionNo: "STU-001",
              fullName: "طالب تجريبي",
              isActive: true,
            },
            academicYear: {
              id: "year-1",
              code: "2026-2027",
              name: "العام 2026-2027",
              status: "ACTIVE",
              isCurrent: true,
            },
            section: {
              id: "sec-1",
              code: "A",
              name: "الشعبة أ",
              isActive: true,
              gradeLevel: {
                id: "grade-1",
                code: "G1",
                name: "الصف الأول",
                stage: "PRIMARY",
                sequence: 1,
              },
            },
          },
        ]),
      );
    });

    await page.route("**/backend/monthly-grades**", async (route) => {
      await fulfillJson(route, listResponse([]));
    });

    await openModulePage({
      page,
      path: "/app/monthly-grades",
      heading: "الدرجات الشهرية",
    });

    await expectSectionLabelOptionExists(page);
  });

  test("annual grades page shows section options as grade/section", async ({
    page,
  }) => {
    await injectAuthSession(page, system05Permissions);

    await mockSectionOptions(page);
    await mockSubjectOptions(page);

    await page.route("**/backend/academic-years**", async (route) => {
      await fulfillJson(
        route,
        listResponse([
          {
            id: "year-1",
            code: "2026-2027",
            name: "العام 2026-2027",
            status: "ACTIVE",
            isCurrent: true,
          },
        ]),
      );
    });

    await page.route("**/backend/annual-statuses**", async (route) => {
      await fulfillJson(
        route,
        listResponse([
          {
            id: "status-1",
            code: "PASS",
            name: "ناجح",
            isSystem: true,
            isActive: true,
          },
        ]),
      );
    });

    await page.route("**/backend/student-enrollments**", async (route) => {
      await fulfillJson(
        route,
        listResponse([
          {
            id: "enr-1",
            studentId: "stu-1",
            academicYearId: "year-1",
            sectionId: "sec-1",
            enrollmentDate: "2026-09-01T00:00:00.000Z",
            status: "ENROLLED",
            notes: null,
            isActive: true,
            createdAt: "2026-09-01T00:00:00.000Z",
            updatedAt: "2026-09-01T00:00:00.000Z",
            createdBy: null,
            updatedBy: null,
            student: {
              id: "stu-1",
              admissionNo: "STU-001",
              fullName: "طالب تجريبي",
              isActive: true,
            },
            academicYear: {
              id: "year-1",
              code: "2026-2027",
              name: "العام 2026-2027",
              status: "ACTIVE",
              isCurrent: true,
            },
            section: {
              id: "sec-1",
              code: "A",
              name: "الشعبة أ",
              isActive: true,
              gradeLevel: {
                id: "grade-1",
                code: "G1",
                name: "الصف الأول",
                stage: "PRIMARY",
                sequence: 1,
              },
            },
          },
        ]),
      );
    });

    await page.route("**/backend/annual-grades**", async (route) => {
      await fulfillJson(route, listResponse([]));
    });

    await openModulePage({
      page,
      path: "/app/annual-grades",
      heading: "الدرجات السنوية",
    });

    await expectSectionLabelOptionExists(page);
  });
});
