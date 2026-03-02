import { expect, test } from "@playwright/test";
import { mockEmployeesOptions, mockListWithPost } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { buildEmployeeFixtures } from "./helpers/fixtures";
import { fillEmployeeCourseForm } from "./helpers/form-actions";
import {
  buildCreatedEmployeeCourseFromPayload,
  buildEmployeeCourseListItem,
} from "./helpers/list-item-builders";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectTextVisible,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

test.describe("Employee Courses", () => {
  test("loads list and creates a new course", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeCoursesCrud);

    const employees = buildEmployeeFixtures(2);

    const coursesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-courses**",
      initialItems: [buildEmployeeCourseListItem(employees[0])],
      onCreate: (payload) => buildCreatedEmployeeCourseFromPayload(payload, employees),
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-courses",
      heading: "دورات الموظفين",
    });
    await expectCardsCount(page, "course-card", 1);

    await fillEmployeeCourseForm(page, {
      employeeId: "emp-1",
      courseName: "Leadership Bootcamp",
      courseProvider: "International Academy",
      courseDate: "2026-02-24",
      durationDays: "3",
      certificateNumber: "CERT-2026-778",
      notes: "Strong leadership performance",
      submit: true,
    });

    await expectCardsCount(page, "course-card", 2);
    await expectTextVisible(page, "Leadership Bootcamp");

    const lastCreatePayload = coursesApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["employeeId"]).toBe("emp-1");
    expect(lastCreatePayload?.["courseName"]).toBe("Leadership Bootcamp");
    expect(lastCreatePayload?.["durationDays"]).toBe(3);
  });

  test("validates required employee before sending request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeCoursesCrud);

    const employees = buildEmployeeFixtures(1);

    const coursesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-courses**",
      initialItems: [],
    });
    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-courses",
      heading: "دورات الموظفين",
    });

    await fillEmployeeCourseForm(page, {
      courseName: "Leadership Bootcamp",
      submit: true,
    });

    await expectValidationMessage(page, "الموظف مطلوب.");
    expect(coursesApi.getPostCount()).toBe(0);
  });
});
