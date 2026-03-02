import { expect, test } from "@playwright/test";
import {
  mockEmployeesOptions,
  mockListWithPost,
  mockTalentsOptions,
} from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { buildEmployeeFixtures, buildTalentFixtures } from "./helpers/fixtures";
import { fillEmployeeTalentForm } from "./helpers/form-actions";
import {
  buildCreatedEmployeeTalentMappingFromPayload,
  buildEmployeeTalentMappingListItem,
} from "./helpers/list-item-builders";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

test.describe("Employee Talents", () => {
  test("loads list and creates a new talent mapping", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeTalentsCrud);

    const employees = buildEmployeeFixtures(2);
    const talents = buildTalentFixtures(2);

    const mappingsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-talents**",
      initialItems: [buildEmployeeTalentMappingListItem(employees[0], talents[0])],
      onCreate: (payload) =>
        buildCreatedEmployeeTalentMappingFromPayload(payload, employees, talents),
    });
    await mockEmployeesOptions(page, employees);
    await mockTalentsOptions(page, talents);

    await openModulePage({
      page,
      path: "/app/employee-talents",
      heading: "مواهب الموظفين",
    });
    await expectCardsCount(page, "talent-mapping-card", 1);

    await fillEmployeeTalentForm(page, {
      employeeId: "emp-2",
      talentId: "tal-2",
      notes: "Leads robotics competitions",
      submit: true,
    });

    await expectCardsCount(page, "talent-mapping-card", 2);
    await expect(
      page
        .getByTestId("talent-mapping-card")
        .first()
        .getByText("Talent: Robotics Coach (TAL-ROBO)"),
    ).toBeVisible();

    const lastCreatePayload = mappingsApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["employeeId"]).toBe("emp-2");
    expect(lastCreatePayload?.["talentId"]).toBe("tal-2");
  });

  test("validates required talent before sending request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeTalentsCrud);

    const employees = buildEmployeeFixtures(1);
    const talents = buildTalentFixtures(1);

    const mappingsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/employee-talents**",
      initialItems: [],
    });
    await mockEmployeesOptions(page, employees);
    await mockTalentsOptions(page, talents);

    await openModulePage({
      page,
      path: "/app/employee-talents",
      heading: "مواهب الموظفين",
    });

    await fillEmployeeTalentForm(page, {
      employeeId: "emp-1",
      submit: true,
    });

    await expectValidationMessage(page, "الموهبة مطلوبة.");
    expect(mappingsApi.getPostCount()).toBe(0);
  });
});
