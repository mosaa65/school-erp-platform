import { expect, test } from "@playwright/test";
import { mockCrudList, mockListWithPost } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import {
  buildAcademicYearFixtures,
  buildEmployeeFixtures,
  buildSectionFixtures,
  buildSubjectFixtures,
} from "./helpers/fixtures";
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

test.describe("Employee Teaching Assignments", () => {
  test("allows create access without update or delete actions", async ({
    page,
  }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeTeachingAssignmentsCreateOnly);

    const employees = buildEmployeeFixtures(2);
    const sections = buildSectionFixtures(2).map((section) => ({
      ...section,
      name: section.id === "sec-1" ? "الشعبة أ" : "الشعبة ب",
      code: section.id === "sec-1" ? "A-1" : "B-2",
      gradeLevelId: "grade-1",
    }));
    const subjects = buildSubjectFixtures(2).map((subject) => ({
      ...subject,
      name: subject.id === "subj-1" ? "رياضيات" : "علوم",
      code: subject.id === "subj-1" ? "MATH" : "SCI",
    }));
    const academicYears = buildAcademicYearFixtures(1).map((year) => ({
      ...year,
      code: "2026-2027",
      name: "العام 2026-2027",
    }));

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
    await page.route("**/backend/subjects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(subjects)),
      });
    });
    await page.route("**/backend/academic-years**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(academicYears)),
      });
    });
    await page.route("**/backend/grade-level-subjects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildListResponse([
            {
              id: "gls-1",
              academicYearId: "year-1",
              gradeLevelId: "grade-1",
              subjectId: "subj-2",
              isMandatory: true,
              weeklyPeriods: 4,
              displayOrder: 1,
              isActive: true,
              createdAt: "2026-03-01T00:00:00.000Z",
              updatedAt: "2026-03-01T00:00:00.000Z",
              academicYear: {
                id: "year-1",
                code: "2026-2027",
                name: "العام 2026-2027",
                status: "ACTIVE",
                isCurrent: true,
              },
              gradeLevel: {
                id: "grade-1",
                code: "G1",
                name: "الصف الأول",
                stage: "PRIMARY",
                sequence: 1,
                isActive: true,
              },
              subject: {
                id: "subj-2",
                code: "SCI",
                name: "علوم",
                category: "SCIENCE",
                isActive: true,
              },
            },
          ]),
        ),
      });
    });

    const assignmentsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-teaching-assignments**",
      initialItems: [
        {
          id: "assign-1",
          employeeId: "emp-1",
          sectionId: "sec-1",
          subjectId: "subj-1",
          academicYearId: "year-1",
          weeklyPeriods: 3,
          isPrimary: true,
          isActive: true,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          employee: employees[0],
          section: {
            id: "sec-1",
            code: "A-1",
            name: "الشعبة أ",
          },
          subject: {
            id: "subj-1",
            code: "MATH",
            name: "رياضيات",
          },
          academicYear: {
            id: "year-1",
            code: "2026-2027",
            name: "العام 2026-2027",
          },
        },
      ],
      onCreate: (payload) => ({
        id: "assign-2",
        employeeId:
          typeof payload.employeeId === "string" ? payload.employeeId : "emp-2",
        sectionId:
          typeof payload.sectionId === "string" ? payload.sectionId : "sec-2",
        subjectId:
          typeof payload.subjectId === "string" ? payload.subjectId : "subj-2",
        academicYearId:
          typeof payload.academicYearId === "string"
            ? payload.academicYearId
            : "year-1",
        weeklyPeriods:
          typeof payload.weeklyPeriods === "number" ? payload.weeklyPeriods : 4,
        isPrimary: payload.isPrimary !== false,
        isActive: payload.isActive !== false,
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        employee: employees[1],
        section: {
          id: "sec-2",
          code: "B-2",
          name: "الشعبة ب",
        },
        subject: {
          id: "subj-2",
          code: "SCI",
          name: "علوم",
        },
        academicYear: {
          id: "year-1",
          code: "2026-2027",
          name: "العام 2026-2027",
        },
      }),
    });

    await openModulePage({
      page,
      path: "/app/employee-teaching-assignments",
      heading: "إسناد التدريس للموظفين",
    });

    await expectCardsCount(page, "employee-teaching-assignment-card", 1);
    await expect(page.getByRole("button", { name: "إضافة إسناد تدريس" })).toBeEnabled();
    await expect(
      page
        .getByTestId("employee-teaching-assignment-card")
        .first()
        .getByRole("button", { name: "تعديل" }),
    ).toBeDisabled();
    await expect(
      page
        .getByTestId("employee-teaching-assignment-card")
        .first()
        .getByRole("button", { name: "حذف" }),
    ).toBeDisabled();

    await page.getByRole("button", { name: "إضافة إسناد تدريس" }).focus();
    await page.keyboard.press("Enter");
    await page
      .getByTestId("employee-teaching-assignment-form-employee")
      .selectOption("emp-2");
    await page
      .getByTestId("employee-teaching-assignment-form-section")
      .selectOption("sec-2");
    await page
      .getByTestId("employee-teaching-assignment-form-subject")
      .selectOption("subj-2");
    await page
      .getByTestId("employee-teaching-assignment-form-academic-year")
      .selectOption("year-1");
    await page
      .getByTestId("employee-teaching-assignment-form-weekly-periods")
      .fill("4");
    await page.getByTestId("employee-teaching-assignment-form-submit").click();

    await expectCardsCount(page, "employee-teaching-assignment-card", 2);
    expect(assignmentsApi.getPostCount()).toBe(1);
  });

  test("allows read-only access without create, update, or delete actions", async ({
    page,
  }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeTeachingAssignmentsReadOnly);

    const employees = buildEmployeeFixtures(1);
    const sections = buildSectionFixtures(1).map((section) => ({
      ...section,
      name: "الشعبة أ",
      code: "A-1",
      gradeLevelId: "grade-1",
    }));
    const subjects = buildSubjectFixtures(1).map((subject) => ({
      ...subject,
      name: "رياضيات",
      code: "MATH",
    }));
    const academicYears = buildAcademicYearFixtures(1).map((year) => ({
      ...year,
      code: "2026-2027",
      name: "العام 2026-2027",
    }));

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
    await page.route("**/backend/subjects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(subjects)),
      });
    });
    await page.route("**/backend/academic-years**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(academicYears)),
      });
    });
    await page.route("**/backend/grade-level-subjects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse([])),
      });
    });

    await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-teaching-assignments**",
      initialItems: [
        {
          id: "assign-1",
          employeeId: "emp-1",
          sectionId: "sec-1",
          subjectId: "subj-1",
          academicYearId: "year-1",
          weeklyPeriods: 3,
          isPrimary: true,
          isActive: true,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          employee: employees[0],
          section: {
            id: "sec-1",
            code: "A-1",
            name: "الشعبة أ",
          },
          subject: {
            id: "subj-1",
            code: "MATH",
            name: "رياضيات",
          },
          academicYear: {
            id: "year-1",
            code: "2026-2027",
            name: "العام 2026-2027",
          },
        },
      ],
    });

    await openModulePage({
      page,
      path: "/app/employee-teaching-assignments",
      heading: "إسناد التدريس للموظفين",
    });

    await expectCardsCount(page, "employee-teaching-assignment-card", 1);
    await expect(page.getByRole("button", { name: "إضافة إسناد تدريس" })).toBeDisabled();
    await expect(
      page
        .getByTestId("employee-teaching-assignment-card")
        .first()
        .getByRole("button", { name: "تعديل" }),
    ).toBeDisabled();
    await expect(
      page
        .getByTestId("employee-teaching-assignment-card")
        .first()
        .getByRole("button", { name: "حذف" }),
    ).toBeDisabled();
  });

  test("loads list and creates a teaching assignment", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeTeachingAssignmentsCrud);

    const employees = buildEmployeeFixtures(2);
    const sections = buildSectionFixtures(2).map((section) => ({
      ...section,
      name: section.id === "sec-1" ? "الشعبة أ" : "الشعبة ب",
      code: section.id === "sec-1" ? "A-1" : "B-2",
      gradeLevelId: "grade-1",
    }));
    const subjects = buildSubjectFixtures(2).map((subject) => ({
      ...subject,
      name: subject.id === "subj-1" ? "رياضيات" : "علوم",
      code: subject.id === "subj-1" ? "MATH" : "SCI",
    }));
    const academicYears = buildAcademicYearFixtures(1).map((year) => ({
      ...year,
      code: "2026-2027",
      name: "العام 2026-2027",
    }));

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

    await page.route("**/backend/subjects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(subjects)),
      });
    });

    await page.route("**/backend/academic-years**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(academicYears)),
      });
    });

    await page.route("**/backend/grade-level-subjects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildListResponse([
            {
              id: "gls-1",
              academicYearId: "year-1",
              gradeLevelId: "grade-1",
              subjectId: "subj-2",
              isMandatory: true,
              weeklyPeriods: 4,
              displayOrder: 1,
              isActive: true,
              createdAt: "2026-03-01T00:00:00.000Z",
              updatedAt: "2026-03-01T00:00:00.000Z",
              academicYear: {
                id: "year-1",
                code: "2026-2027",
                name: "العام 2026-2027",
                status: "ACTIVE",
                isCurrent: true,
              },
              gradeLevel: {
                id: "grade-1",
                code: "G1",
                name: "الصف الأول",
                stage: "PRIMARY",
                sequence: 1,
                isActive: true,
              },
              subject: {
                id: "subj-2",
                code: "SCI",
                name: "علوم",
                category: "SCIENCE",
                isActive: true,
              },
            },
          ]),
        ),
      });
    });

    const assignmentsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-teaching-assignments**",
      initialItems: [
        {
          id: "assign-1",
          employeeId: "emp-1",
          sectionId: "sec-1",
          subjectId: "subj-1",
          academicYearId: "year-1",
          weeklyPeriods: 3,
          isPrimary: true,
          isActive: true,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          employee: employees[0],
          section: {
            id: "sec-1",
            code: "A-1",
            name: "الشعبة أ",
          },
          subject: {
            id: "subj-1",
            code: "MATH",
            name: "رياضيات",
          },
          academicYear: {
            id: "year-1",
            code: "2026-2027",
            name: "العام 2026-2027",
          },
        },
      ],
      onCreate: (payload) => ({
        id: "assign-2",
        employeeId:
          typeof payload.employeeId === "string" ? payload.employeeId : "emp-2",
        sectionId:
          typeof payload.sectionId === "string" ? payload.sectionId : "sec-2",
        subjectId:
          typeof payload.subjectId === "string" ? payload.subjectId : "subj-2",
        academicYearId:
          typeof payload.academicYearId === "string"
            ? payload.academicYearId
            : "year-1",
        weeklyPeriods:
          typeof payload.weeklyPeriods === "number" ? payload.weeklyPeriods : 4,
        isPrimary: payload.isPrimary !== false,
        isActive: payload.isActive !== false,
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        employee: employees[1],
        section: {
          id: "sec-2",
          code: "B-2",
          name: "الشعبة ب",
        },
        subject: {
          id: "subj-2",
          code: "SCI",
          name: "علوم",
        },
        academicYear: {
          id: "year-1",
          code: "2026-2027",
          name: "العام 2026-2027",
        },
      }),
    });

    await openModulePage({
      page,
      path: "/app/employee-teaching-assignments",
      heading: "إسناد التدريس للموظفين",
    });

    await expectCardsCount(page, "employee-teaching-assignment-card", 1);

    await page.getByRole("button", { name: "إضافة إسناد تدريس" }).focus();
    await page.keyboard.press("Enter");
    await page
      .getByTestId("employee-teaching-assignment-form-employee")
      .selectOption("emp-2");
    await page
      .getByTestId("employee-teaching-assignment-form-section")
      .selectOption("sec-2");
    await page
      .getByTestId("employee-teaching-assignment-form-subject")
      .selectOption("subj-2");
    await page
      .getByTestId("employee-teaching-assignment-form-academic-year")
      .selectOption("year-1");
    await page
      .getByTestId("employee-teaching-assignment-form-weekly-periods")
      .fill("4");
    await page.getByTestId("employee-teaching-assignment-form-submit").click();

    await expectCardsCount(page, "employee-teaching-assignment-card", 2);
    await expect(
      page
        .getByTestId("employee-teaching-assignment-card")
        .first()
        .getByText("Sara Omar - علوم"),
    ).toBeVisible();

    const payload = assignmentsApi.getLastCreatePayload();
    expect(payload).not.toBeNull();
    expect(payload?.["employeeId"]).toBe("emp-2");
    expect(payload?.["sectionId"]).toBe("sec-2");
    expect(payload?.["subjectId"]).toBe("subj-2");
    expect(payload?.["academicYearId"]).toBe("year-1");
    expect(payload?.["weeklyPeriods"]).toBe(4);
  });

  test("updates then deletes a teaching assignment", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeTeachingAssignmentsCrud);

    const employees = buildEmployeeFixtures(2);
    const sections = buildSectionFixtures(2).map((section) => ({
      ...section,
      name: section.id === "sec-1" ? "الشعبة أ" : "الشعبة ب",
      code: section.id === "sec-1" ? "A-1" : "B-2",
      gradeLevelId: "grade-1",
    }));
    const subjects = buildSubjectFixtures(2).map((subject) => ({
      ...subject,
      name: subject.id === "subj-1" ? "رياضيات" : "علوم",
      code: subject.id === "subj-1" ? "MATH" : "SCI",
    }));
    const academicYears = buildAcademicYearFixtures(1).map((year) => ({
      ...year,
      code: "2026-2027",
      name: "العام 2026-2027",
    }));

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

    await page.route("**/backend/subjects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(subjects)),
      });
    });

    await page.route("**/backend/academic-years**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(academicYears)),
      });
    });

    await page.route("**/backend/grade-level-subjects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildListResponse([
            {
              id: "gls-1",
              academicYearId: "year-1",
              gradeLevelId: "grade-1",
              subjectId: "subj-2",
              isMandatory: true,
              weeklyPeriods: 4,
              displayOrder: 1,
              isActive: true,
              createdAt: "2026-03-01T00:00:00.000Z",
              updatedAt: "2026-03-01T00:00:00.000Z",
              academicYear: {
                id: "year-1",
                code: "2026-2027",
                name: "العام 2026-2027",
                status: "ACTIVE",
                isCurrent: true,
              },
              gradeLevel: {
                id: "grade-1",
                code: "G1",
                name: "الصف الأول",
                stage: "PRIMARY",
                sequence: 1,
                isActive: true,
              },
              subject: {
                id: "subj-2",
                code: "SCI",
                name: "علوم",
                category: "SCIENCE",
                isActive: true,
              },
            },
          ]),
        ),
      });
    });

    const assignmentsApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employee-teaching-assignments**",
      initialItems: [
        {
          id: "assign-1",
          employeeId: "emp-1",
          sectionId: "sec-1",
          subjectId: "subj-1",
          academicYearId: "year-1",
          weeklyPeriods: 3,
          isPrimary: true,
          isActive: true,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          employee: employees[0],
          section: {
            id: "sec-1",
            code: "A-1",
            name: "الشعبة أ",
          },
          subject: {
            id: "subj-1",
            code: "MATH",
            name: "رياضيات",
          },
          academicYear: {
            id: "year-1",
            code: "2026-2027",
            name: "العام 2026-2027",
          },
        },
      ],
      onUpdate: (payload, context) => ({
        ...context.item,
        weeklyPeriods:
          typeof payload.weeklyPeriods === "number"
            ? payload.weeklyPeriods
            : context.item.weeklyPeriods,
        isPrimary:
          typeof payload.isPrimary === "boolean"
            ? payload.isPrimary
            : context.item.isPrimary,
        updatedAt: "2026-03-03T00:00:00.000Z",
      }),
    });

    await openModulePage({
      page,
      path: "/app/employee-teaching-assignments",
      heading: "إسناد التدريس للموظفين",
    });

    await expectCardsCount(page, "employee-teaching-assignment-card", 1);

    await page
      .getByTestId("employee-teaching-assignment-card")
      .first()
      .getByRole("button", { name: "تعديل" })
      .click();
    await page
      .getByTestId("employee-teaching-assignment-form-weekly-periods")
      .fill("6");
    await page.getByTestId("employee-teaching-assignment-form-submit").click();

    await expect(
      page.getByTestId("employee-teaching-assignment-card").first(),
    ).toContainText("الحصص الأسبوعية: 6");

    const updatePayload = assignmentsApi.getLastUpdatePayload();
    expect(updatePayload).not.toBeNull();
    expect(updatePayload?.["weeklyPeriods"]).toBe(6);

    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByTestId("employee-teaching-assignment-card")
      .first()
      .getByRole("button", { name: "حذف" })
      .click();

    await expect(page.getByTestId("employee-teaching-assignment-card")).toHaveCount(0);
    expect(assignmentsApi.getLastDeletedId()).toBe("assign-1");
  });
});
