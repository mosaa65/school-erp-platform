import { expect, test } from "@playwright/test";
import { mockEmployeesOptions, mockListWithPost } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { buildEmployeeFixtures } from "./helpers/fixtures";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

type EmployeeAttendanceListItem = {
  id: string;
  employeeId: string;
  attendanceDate: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
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
};

function buildEmployeeAttendanceListItem(
  employee: {
    id: string;
    fullName: string;
    jobNumber: string;
    jobTitle: string;
  },
  overrides: Partial<EmployeeAttendanceListItem> = {},
): EmployeeAttendanceListItem {
  return {
    id: overrides.id ?? "attendance-1",
    employeeId: overrides.employeeId ?? employee.id,
    attendanceDate: overrides.attendanceDate ?? "2026-03-01T00:00:00.000Z",
    status: overrides.status ?? "PRESENT",
    checkInAt: overrides.checkInAt ?? "2026-03-01T07:30:00.000Z",
    checkOutAt: overrides.checkOutAt ?? "2026-03-01T14:00:00.000Z",
    notes: overrides.notes ?? "انضباط ممتاز",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-03-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-03-01T00:00:00.000Z",
    employee: {
      id: employee.id,
      fullName: employee.fullName,
      jobNumber: employee.jobNumber,
      jobTitle: employee.jobTitle,
    },
  };
}

test.describe("Employee Attendance", () => {
  test("loads records and creates a new attendance entry", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeAttendanceCrud);

    const employees = buildEmployeeFixtures(2);
    const attendanceApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-attendance**",
      initialItems: [buildEmployeeAttendanceListItem(employees[0])],
      onCreate: (payload) => {
        const employeeId =
          typeof payload.employeeId === "string" ? payload.employeeId : employees[0].id;
        const employee =
          employees.find((item) => item.id === employeeId) ?? employees[0];

        return buildEmployeeAttendanceListItem(employee, {
          id: "attendance-2",
          employeeId,
          attendanceDate:
            typeof payload.attendanceDate === "string"
              ? payload.attendanceDate
              : "2026-03-06T00:00:00.000Z",
          status: typeof payload.status === "string" ? payload.status : "LATE",
          checkInAt:
            typeof payload.checkInAt === "string" ? payload.checkInAt : null,
          checkOutAt:
            typeof payload.checkOutAt === "string" ? payload.checkOutAt : null,
          notes: typeof payload.notes === "string" ? payload.notes : null,
          isActive:
            payload.isActive === undefined ? true : Boolean(payload.isActive),
          createdAt: "2026-03-06T00:00:00.000Z",
          updatedAt: "2026-03-06T00:00:00.000Z",
        });
      },
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-attendance",
      heading: "حضور الموظفين",
    });
    await expectCardsCount(page, "attendance-card", 1);

    await page
      .getByRole("button", { name: "إنشاء سجل حضور" })
      .evaluate((button: HTMLButtonElement) => button.click());
    await page.getByTestId("attendance-form-employee").selectOption("emp-2");
    await page.getByTestId("attendance-form-date").fill("2026-03-06");
    await page.getByTestId("attendance-form-status").selectOption("LATE");
    await page.getByTestId("attendance-form-check-in").fill("2026-03-06T07:45");
    await page.getByTestId("attendance-form-check-out").fill("2026-03-06T14:05");
    await page.getByTestId("attendance-form-notes").fill("تأخر 15 دقيقة");
    await page.getByTestId("attendance-form-submit").click();

    await expectCardsCount(page, "attendance-card", 2);
    await expect(page.getByText("تأخر 15 دقيقة")).toBeVisible();

    const lastCreatePayload = attendanceApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["employeeId"]).toBe("emp-2");
    expect(lastCreatePayload?.["attendanceDate"]).toBe("2026-03-06T00:00:00.000Z");
    expect(lastCreatePayload?.["status"]).toBe("LATE");
  });

  test("validates required employee before sending request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeAttendanceCrud);

    const employees = buildEmployeeFixtures(1);
    const attendanceApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-attendance**",
      initialItems: [],
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-attendance",
      heading: "حضور الموظفين",
    });

    await page
      .getByRole("button", { name: "إنشاء سجل حضور" })
      .evaluate((button: HTMLButtonElement) => button.click());
    await page.getByTestId("attendance-form-date").fill("2026-03-06");
    await page.getByTestId("attendance-form-submit").click();

    await expectValidationMessage(page, "الموظف مطلوب.");
    expect(attendanceApi.getPostCount()).toBe(0);
  });
});
