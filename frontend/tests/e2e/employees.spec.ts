import { expect, test } from "@playwright/test";
import {
  mockCrudList,
  mockEmployeeOrganizationOptions,
  mockListWithPost,
} from "./helpers/api-mocks";
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

function buildEmployeeListItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "emp-1",
    jobNumber: "EMP-001",
    financialNumber: "FIN-001",
    fullName: "أحمد علي",
    gender: "MALE",
    genderId: 1,
    birthDate: null,
    phonePrimary: null,
    phoneSecondary: null,
    hasWhatsapp: true,
    qualification: null,
    qualificationId: null,
    qualificationDate: null,
    specialization: null,
    idNumber: null,
    idTypeId: null,
    localityId: null,
    departmentId: null,
    branchId: null,
    directManagerEmployeeId: null,
    costCenterId: null,
    idExpiryDate: null,
    experienceYears: 5,
    employmentType: "PERMANENT",
    jobTitle: "معلم رياضيات",
    jobRoleId: null,
    hireDate: null,
    previousSchool: null,
    salaryApproved: true,
    systemAccessStatus: "GRANTED",
    isActive: true,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    qualificationLookup: null,
    department: null,
    branch: null,
    costCenter: null,
    directManager: null,
    jobRoleLookup: {
      id: 10,
      code: "teacher",
      nameAr: "معلم",
      name: "Teacher",
      isActive: true,
    },
    userAccount: null,
    operationalScope: {
      activeTeachingAssignments: 0,
      activeSectionSupervisions: 0,
    },
    ...overrides,
  };
}

test.describe("Employees", () => {
  test("allows reading employees even without lookup permissions", async ({
    page,
  }) => {
    await injectAuthSession(page, e2ePermissionSets.employeesReadNoLookups);

    await mockListWithPost({
      page,
      urlPattern: "**/backend/employees**",
      initialItems: [
        buildEmployeeListItem({
          fullName: "موظف بدون lookup",
          financialNumber: "FIN-READ-1",
        }),
      ],
    });
    await mockEmployeeOrganizationOptions(page);

    for (const pattern of [
      "**/backend/lookup/catalog/genders**",
      "**/backend/lookup/catalog/qualifications**",
      "**/backend/lookup/catalog/job-roles**",
      "**/backend/lookup/catalog/governorates**",
      "**/backend/lookup/catalog/directorates**",
      "**/backend/lookup/catalog/sub-districts**",
      "**/backend/lookup/catalog/villages**",
      "**/backend/lookup/catalog/localities**",
      "**/backend/lookup/id-types**",
    ]) {
      await page.route(pattern, async (route) => {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ message: "Forbidden" }),
        });
      });
    }

    await openModulePage({
      page,
      path: "/app/employees",
      heading: "الموظفون",
    });

    await expectCardsCount(page, "employee-card", 1);
    await expect(page.getByTestId("employee-card").first()).toContainText(
      "موظف بدون lookup",
    );
    await expect(page.getByRole("button", { name: "إضافة موظف" })).toBeDisabled();
    await expect(
      page.getByTestId("employee-card").first().getByRole("button", { name: "تعديل" }),
    ).toBeDisabled();
    await expect(
      page.getByTestId("employee-card").first().getByRole("button", { name: "حذف" }),
    ).toBeDisabled();
  });

  test("allows read-only access without create, update, or delete actions", async ({
    page,
  }) => {
    await injectAuthSession(page, e2ePermissionSets.employeesReadOnly);

    const genders = [
      {
        id: 1,
        code: "MALE",
        nameAr: "ذكر",
        name: "Male",
        isActive: true,
      },
    ];

    const emptyLookup = buildListResponse([]);

    await page.route("**/backend/lookup/catalog/genders**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(genders)),
      });
    });

    for (const pattern of [
      "**/backend/lookup/catalog/qualifications**",
      "**/backend/lookup/catalog/job-roles**",
      "**/backend/lookup/catalog/governorates**",
      "**/backend/lookup/catalog/directorates**",
      "**/backend/lookup/catalog/sub-districts**",
      "**/backend/lookup/catalog/villages**",
      "**/backend/lookup/catalog/localities**",
      "**/backend/lookup/id-types**",
    ]) {
      await page.route(pattern, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(emptyLookup),
        });
      });
    }

    await mockListWithPost({
      page,
      urlPattern: "**/backend/employees**",
      initialItems: [buildEmployeeListItem()],
    });
    await mockEmployeeOrganizationOptions(page);

    await openModulePage({
      page,
      path: "/app/employees",
      heading: "الموظفون",
    });

    await expectCardsCount(page, "employee-card", 1);
    await expect(page.getByRole("button", { name: "إضافة موظف" })).toBeDisabled();
    await expect(
      page.getByTestId("employee-card").first().getByRole("button", { name: "تعديل" }),
    ).toBeDisabled();
    await expect(
      page.getByTestId("employee-card").first().getByRole("button", { name: "حذف" }),
    ).toBeDisabled();
  });

  test("validates and creates an employee record", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeesCrud);

    const genders = [
      {
        id: 1,
        code: "MALE",
        nameAr: "ذكر",
        name: "Male",
        isActive: true,
      },
      {
        id: 2,
        code: "FEMALE",
        nameAr: "أنثى",
        name: "Female",
        isActive: true,
      },
    ];

    const emptyLookup = buildListResponse([]);

    await page.route("**/backend/lookup/catalog/genders**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(genders)),
      });
    });

    for (const pattern of [
      "**/backend/lookup/catalog/qualifications**",
      "**/backend/lookup/catalog/job-roles**",
      "**/backend/lookup/catalog/governorates**",
      "**/backend/lookup/catalog/directorates**",
      "**/backend/lookup/catalog/sub-districts**",
      "**/backend/lookup/catalog/villages**",
      "**/backend/lookup/catalog/localities**",
      "**/backend/lookup/id-types**",
    ]) {
      await page.route(pattern, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(emptyLookup),
        });
      });
    }

    const employeesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/employees**",
      initialItems: [buildEmployeeListItem()],
      onCreate: (payload) =>
        buildEmployeeListItem({
          id: "emp-2",
          jobNumber:
            typeof payload.jobNumber === "string" ? payload.jobNumber : "EMP-002",
          financialNumber:
            typeof payload.financialNumber === "string"
              ? payload.financialNumber
              : "FIN-002",
          fullName:
            typeof payload.fullName === "string" ? payload.fullName : "موظف جديد",
          gender: typeof payload.gender === "string" ? payload.gender : "MALE",
          genderId:
            typeof payload.genderId === "number" ? payload.genderId : 1,
          experienceYears:
            typeof payload.experienceYears === "number"
              ? payload.experienceYears
              : 0,
          createdAt: "2026-03-02T00:00:00.000Z",
          updatedAt: "2026-03-02T00:00:00.000Z",
        }),
    });
    await mockEmployeeOrganizationOptions(page, {
      departments: [
        {
          id: "dept-1",
          code: "HR",
          name: "الموارد البشرية",
          isActive: true,
        },
      ],
      branches: [
        {
          id: 2,
          code: "MAIN",
          nameAr: "الفرع الرئيسي",
          isActive: true,
        },
      ],
      costCenters: [
        {
          id: 7,
          code: "CC-7",
          nameAr: "مركز تكلفة الإدارة",
          isActive: true,
          branchId: 2,
        },
      ],
      managers: [
        {
          id: "emp-1",
          fullName: "أحمد علي",
          jobNumber: "EMP-001",
          jobTitle: "مدير",
          isActive: true,
        },
      ],
    });

    await openModulePage({
      page,
      path: "/app/employees",
      heading: "الموظفون",
    });

    await expectCardsCount(page, "employee-card", 1);

    await page.getByRole("button", { name: "إضافة موظف" }).focus();
    await page.keyboard.press("Enter");

    await page.getByTestId("employee-form-job-number").fill("EMP-777");
    await page.getByTestId("employee-form-financial-number").fill("FIN-777");
    await page.getByTestId("employee-form-full-name").fill("سلمى خالد");
    await page.getByTestId("employee-form-gender").selectOption("2");
    await page.getByTestId("employee-form-department").selectOption("dept-1");
    await page.getByTestId("employee-form-branch").selectOption("2");
    await page.getByTestId("employee-form-manager").selectOption("emp-1");
    await page.getByTestId("employee-form-cost-center").selectOption("7");
    await page.getByTestId("employee-form-submit").click();

    await expect(page.getByTestId("employee-success-banner")).toContainText(
      "تم إنشاء الموظف بنجاح.",
    );
    await expectCardsCount(page, "employee-card", 2);
    await expect(page.getByTestId("employee-card").first()).toContainText(
      "سلمى خالد",
    );

    const payload = employeesApi.getLastCreatePayload();
    expect(payload).not.toBeNull();
    expect(payload?.["jobNumber"]).toBe("EMP-777");
    expect(payload?.["financialNumber"]).toBe("FIN-777");
    expect(payload?.["fullName"]).toBe("سلمى خالد");
    expect(payload?.["gender"]).toBe("FEMALE");
    expect(payload?.["genderId"]).toBe(2);
    expect(payload?.["departmentId"]).toBe("dept-1");
    expect(payload?.["branchId"]).toBe(2);
    expect(payload?.["directManagerEmployeeId"]).toBe("emp-1");
    expect(payload?.["costCenterId"]).toBe(7);
  });

  test("updates then deletes an employee record", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeesCrud);

    const genders = [
      {
        id: 1,
        code: "MALE",
        nameAr: "ذكر",
        name: "Male",
        isActive: true,
      },
      {
        id: 2,
        code: "FEMALE",
        nameAr: "أنثى",
        name: "Female",
        isActive: true,
      },
    ];

    const emptyLookup = buildListResponse([]);

    await page.route("**/backend/lookup/catalog/genders**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListResponse(genders)),
      });
    });

    for (const pattern of [
      "**/backend/lookup/catalog/qualifications**",
      "**/backend/lookup/catalog/job-roles**",
      "**/backend/lookup/catalog/governorates**",
      "**/backend/lookup/catalog/directorates**",
      "**/backend/lookup/catalog/sub-districts**",
      "**/backend/lookup/catalog/villages**",
      "**/backend/lookup/catalog/localities**",
      "**/backend/lookup/id-types**",
    ]) {
      await page.route(pattern, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(emptyLookup),
        });
      });
    }

    const employeesApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employees**",
      initialItems: [buildEmployeeListItem()],
      onUpdate: (payload, context) =>
        buildEmployeeListItem({
          ...context.item,
          fullName:
            typeof payload.fullName === "string"
              ? payload.fullName
              : context.item.fullName,
          financialNumber:
            typeof payload.financialNumber === "string"
              ? payload.financialNumber
              : context.item.financialNumber,
          gender: typeof payload.gender === "string" ? payload.gender : context.item.gender,
          genderId:
            typeof payload.genderId === "number" ? payload.genderId : context.item.genderId,
          updatedAt: "2026-03-03T00:00:00.000Z",
        }),
    });
    await mockEmployeeOrganizationOptions(page);

    await openModulePage({
      page,
      path: "/app/employees",
      heading: "الموظفون",
    });

    await expectCardsCount(page, "employee-card", 1);

    await page.getByTestId("employee-card").first().getByRole("button", { name: "تعديل" }).click();
    await page.getByTestId("employee-form-full-name").fill("أحمد علي المعدل");
    await page.getByTestId("employee-form-financial-number").fill("FIN-UPDATED");
    await page.getByTestId("employee-form-submit").click();

    await expect(page.getByTestId("employee-success-banner")).toContainText(
      "تم تحديث الموظف بنجاح.",
    );
    await expect(page.getByTestId("employee-card").first()).toContainText("أحمد علي المعدل");

    const updatePayload = employeesApi.getLastUpdatePayload();
    expect(updatePayload).not.toBeNull();
    expect(updatePayload?.["fullName"]).toBe("أحمد علي المعدل");
    expect(updatePayload?.["financialNumber"]).toBe("FIN-UPDATED");

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("employee-card").first().getByRole("button", { name: "حذف" }).click();

    await expect(page.getByTestId("employee-success-banner")).toContainText(
      "تم حذف الموظف بنجاح.",
    );
    await expect(page.getByTestId("employee-card")).toHaveCount(0);
    expect(employeesApi.getLastDeletedId()).toBe("emp-1");
  });
});
