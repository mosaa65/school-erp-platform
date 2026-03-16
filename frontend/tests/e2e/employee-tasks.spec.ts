import { expect, test } from "@playwright/test";
import {
  mockAcademicYearsOptions,
  mockEmployeesOptions,
  mockListWithPost,
} from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { buildAcademicYearFixtures, buildEmployeeFixtures } from "./helpers/fixtures";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectTextVisible,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

type EmployeeTaskListItem = {
  id: string;
  employeeId: string;
  academicYearId: string | null;
  taskName: string;
  dayOfWeek: string | null;
  assignmentDate: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    jobNumber: string;
    jobTitle: string;
  };
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: string;
  } | null;
};

function buildEmployeeTaskListItem(
  employee: { id: string; fullName: string; jobNumber: string; jobTitle: string },
  year: { id: string; code: string; name: string; status: string } | null,
  overrides: Partial<EmployeeTaskListItem> = {},
): EmployeeTaskListItem {
  return {
    id: overrides.id ?? "task-1",
    employeeId: overrides.employeeId ?? employee.id,
    academicYearId: overrides.academicYearId ?? year?.id ?? null,
    taskName: overrides.taskName ?? "إشراف طابور الصباح",
    dayOfWeek: overrides.dayOfWeek ?? "MONDAY",
    assignmentDate: overrides.assignmentDate ?? "2026-03-01T00:00:00.000Z",
    notes: overrides.notes ?? "مناوبة البوابة",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-03-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-03-01T00:00:00.000Z",
    employee: {
      id: employee.id,
      fullName: employee.fullName,
      jobNumber: employee.jobNumber,
      jobTitle: employee.jobTitle,
    },
    academicYear:
      year === null
        ? null
        : {
            id: year.id,
            code: year.code,
            name: year.name,
            status: year.status,
          },
  };
}

test.describe("Employee Tasks", () => {
  test("loads list and creates a new employee task", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeTasksCrud);

    const employees = buildEmployeeFixtures(2);
    const academicYears = buildAcademicYearFixtures(1);
    const defaultYear = academicYears[0];

    const tasksApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-tasks**",
      initialItems: [buildEmployeeTaskListItem(employees[0], defaultYear)],
      onCreate: (payload) => {
        const employeeId = typeof payload.employeeId === "string" ? payload.employeeId : employees[0].id;
        const academicYearId =
          typeof payload.academicYearId === "string" ? payload.academicYearId : null;
        const employee =
          employees.find((item) => item.id === employeeId) ?? employees[0];
        const year =
          academicYearId === null
            ? null
            : academicYears.find((item) => item.id === academicYearId) ?? defaultYear;

        return buildEmployeeTaskListItem(employee, year, {
          id: "task-2",
          employeeId,
          academicYearId,
          taskName:
            typeof payload.taskName === "string"
              ? payload.taskName
              : "مهمة جديدة",
          dayOfWeek:
            typeof payload.dayOfWeek === "string" ? payload.dayOfWeek : null,
          assignmentDate:
            typeof payload.assignmentDate === "string"
              ? payload.assignmentDate
              : null,
          notes: typeof payload.notes === "string" ? payload.notes : null,
          isActive:
            payload.isActive === undefined ? true : Boolean(payload.isActive),
          createdAt: "2026-03-02T00:00:00.000Z",
          updatedAt: "2026-03-02T00:00:00.000Z",
        });
      },
    });

    await mockEmployeesOptions(page, employees);
    await mockAcademicYearsOptions(page, academicYears);

    await openModulePage({
      page,
      path: "/app/employee-tasks",
      heading: "مهام الموظفين",
    });
    await expectCardsCount(page, "task-card", 1);

    await page.getByTestId("task-form-employee").selectOption("emp-2");
    await page.getByTestId("task-form-name").fill("إشراف اختبار الرياضيات");
    await page.getByTestId("task-form-year").selectOption("year-1");
    await page.getByTestId("task-form-day").selectOption("THURSDAY");
    await page.getByTestId("task-form-date").fill("2026-03-05");
    await page.getByTestId("task-form-notes").fill("قبل الحصة الأولى");
    await page.getByTestId("task-form-submit").click();

    await expectCardsCount(page, "task-card", 2);
    await expectTextVisible(page, "إشراف اختبار الرياضيات");
    await expect(
      page.getByTestId("task-card").first().getByText(/^الخميس$/),
    ).toBeVisible();

    const lastCreatePayload = tasksApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["employeeId"]).toBe("emp-2");
    expect(lastCreatePayload?.["dayOfWeek"]).toBe("THURSDAY");
    expect(lastCreatePayload?.["assignmentDate"]).toBe("2026-03-05T00:00:00.000Z");
  });

  test("validates required employee before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeTasksCrud);

    const employees = buildEmployeeFixtures(1);
    const academicYears = buildAcademicYearFixtures(1);

    const tasksApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-tasks**",
      initialItems: [],
    });
    await mockEmployeesOptions(page, employees);
    await mockAcademicYearsOptions(page, academicYears);

    await openModulePage({
      page,
      path: "/app/employee-tasks",
      heading: "مهام الموظفين",
    });

    await page.getByTestId("task-form-name").fill("إشراف حافلة");
    await page.getByTestId("task-form-submit").click();

    await expectValidationMessage(page, "الموظف مطلوب.");
    expect(tasksApi.getPostCount()).toBe(0);
  });
});
