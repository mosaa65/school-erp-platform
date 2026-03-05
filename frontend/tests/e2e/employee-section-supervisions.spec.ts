import { expect, test } from "@playwright/test";
import { mockListWithPost } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { e2ePermissionSets } from "./helpers/permissions";
import { expectCardsCount, openModulePage } from "./helpers/ui-assertions";

function buildListResponse(data: unknown[]) {
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

test.describe("Employee Section Supervisions", () => {
  test("loads list and creates a supervision scope", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeSectionSupervisionsCrud);

    const employees = [
      {
        id: "emp-1",
        fullName: "أحمد علي",
        jobNumber: "EMP-0001",
        jobTitle: "مشرف",
        isActive: true,
      },
      {
        id: "emp-2",
        fullName: "سارة محمد",
        jobNumber: "EMP-0002",
        jobTitle: "معلم",
        isActive: true,
      },
    ];

    const sections = [
      {
        id: "sec-1",
        code: "A-1",
        name: "الشعبة أ",
        isActive: true,
      },
      {
        id: "sec-2",
        code: "B-2",
        name: "الشعبة ب",
        isActive: true,
      },
    ];

    const academicYears = [
      {
        id: "year-1",
        code: "2026-2027",
        name: "العام 2026-2027",
        status: "ACTIVE",
        isCurrent: true,
      },
    ];

    await page.route("**/backend/employees**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(employees)),
      });
    });

    await page.route("**/backend/sections**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(sections)),
      });
    });

    await page.route("**/backend/academic-years**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(academicYears)),
      });
    });

    const supervisionApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-section-supervisions**",
      initialItems: [
        {
          id: "sup-1",
          employeeId: "emp-1",
          sectionId: "sec-1",
          academicYearId: "year-1",
          canViewStudents: true,
          canManageHomeworks: true,
          canManageGrades: false,
          isActive: true,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          employee: {
            id: "emp-1",
            fullName: "أحمد علي",
            jobNumber: "EMP-0001",
            jobTitle: "مشرف",
          },
          section: {
            id: "sec-1",
            code: "A-1",
            name: "الشعبة أ",
            gradeLevel: {
              id: "grade-1",
              code: "G1",
              name: "الصف الأول",
            },
          },
          academicYear: {
            id: "year-1",
            code: "2026-2027",
            name: "العام 2026-2027",
            status: "ACTIVE",
          },
        },
      ],
      onCreate: (payload) => ({
        id: "sup-2",
        employeeId: typeof payload.employeeId === "string" ? payload.employeeId : "emp-2",
        sectionId: typeof payload.sectionId === "string" ? payload.sectionId : "sec-2",
        academicYearId:
          typeof payload.academicYearId === "string" ? payload.academicYearId : "year-1",
        canViewStudents: payload.canViewStudents !== false,
        canManageHomeworks: payload.canManageHomeworks !== false,
        canManageGrades: payload.canManageGrades === true,
        isActive: payload.isActive !== false,
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        employee: {
          id: "emp-2",
          fullName: "سارة محمد",
          jobNumber: "EMP-0002",
          jobTitle: "معلم",
        },
        section: {
          id: "sec-2",
          code: "B-2",
          name: "الشعبة ب",
          gradeLevel: {
            id: "grade-2",
            code: "G2",
            name: "الصف الثاني",
          },
        },
        academicYear: {
          id: "year-1",
          code: "2026-2027",
          name: "العام 2026-2027",
          status: "ACTIVE",
        },
      }),
    });

    await openModulePage({
      page,
      path: "/app/employee-section-supervisions",
      heading: "نطاقات إشراف الموظفين",
    });

    await expectCardsCount(page, "employee-section-supervision-card", 1);

    await page
      .getByTestId("employee-section-supervision-form-employee")
      .selectOption("emp-2");
    await page.getByTestId("employee-section-supervision-form-section").selectOption("sec-2");
    await page
      .getByTestId("employee-section-supervision-form-academic-year")
      .selectOption("year-1");
    await page.getByTestId("employee-section-supervision-form-submit").click();

    await expectCardsCount(page, "employee-section-supervision-card", 2);
    await expect(
      page.getByTestId("employee-section-supervision-card").first().getByText("سارة محمد"),
    ).toBeVisible();

    const payload = supervisionApi.getLastCreatePayload();
    expect(payload).not.toBeNull();
    expect(payload?.["employeeId"]).toBe("emp-2");
    expect(payload?.["sectionId"]).toBe("sec-2");
    expect(payload?.["academicYearId"]).toBe("year-1");
  });
});

