import { expect, test } from "@playwright/test";
import { mockCrudList } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { fillEmployeeDepartmentForm } from "./helpers/form-actions";
import { buildEmployeeDepartmentListItem } from "./helpers/list-item-builders";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectTextVisible,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

test.describe("Employee Departments", () => {
  test("loads list and creates a new department", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeDepartmentsCrud);

    const departmentsApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employee-departments**",
      initialItems: [buildEmployeeDepartmentListItem()],
      onCreate: (payload) =>
        buildEmployeeDepartmentListItem({
          id: "department-2",
          code: String(payload["code"] ?? "HR-REC"),
          name: String(payload["name"] ?? "الاستقطاب"),
          description:
            payload["description"] === undefined ? null : String(payload["description"]),
          isActive: payload["isActive"] === undefined ? true : Boolean(payload["isActive"]),
        }),
    });

    await openModulePage({
      page,
      path: "/app/employee-departments",
      heading: "أقسام الموظفين",
    });

    await expectCardsCount(page, "department-card", 1);
    await page
      .getByRole("button", { name: "إضافة قسم موظفين" })
      .evaluate((element) => (element as HTMLButtonElement).click());

    await fillEmployeeDepartmentForm(page, {
      code: "HR-REC",
      name: "الاستقطاب والتوظيف",
      description: "قسم يتابع التوظيف الأولي",
      submit: true,
    });

    await expectCardsCount(page, "department-card", 2);
    await expectTextVisible(page, "الاستقطاب والتوظيف");

    const payload = departmentsApi.getLastCreatePayload();
    expect(payload?.["code"]).toBe("HR-REC");
    expect(payload?.["name"]).toBe("الاستقطاب والتوظيف");
  });

  test("validates required name before sending request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeDepartmentsCrud);

    const departmentsApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employee-departments**",
      initialItems: [],
    });

    await openModulePage({
      page,
      path: "/app/employee-departments",
      heading: "أقسام الموظفين",
    });

    await page
      .getByRole("button", { name: "إضافة قسم موظفين" })
      .evaluate((element) => (element as HTMLButtonElement).click());

    await fillEmployeeDepartmentForm(page, {
      code: "HR-REC",
      submit: true,
    });

    await expectValidationMessage(page, "اسم القسم مطلوب.");
    expect(departmentsApi.getPostCount()).toBe(0);
  });
});
