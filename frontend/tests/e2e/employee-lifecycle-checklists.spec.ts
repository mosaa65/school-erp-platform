import { expect, test } from "@playwright/test";
import { mockCrudList, mockEmployeesOptions } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { buildEmployeeFixtures } from "./helpers/fixtures";
import { fillEmployeeLifecycleChecklistForm } from "./helpers/form-actions";
import { buildEmployeeLifecycleChecklistListItem } from "./helpers/list-item-builders";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectTextVisible,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

test.describe("Employee Lifecycle Checklists", () => {
  test("loads list and creates a lifecycle task", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeLifecycleChecklistsCrud);

    const employees = buildEmployeeFixtures(2);

    const lifecycleApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employee-lifecycle-checklists**",
      initialItems: [buildEmployeeLifecycleChecklistListItem(employees[0], employees[1])],
      onCreate: (payload) => {
        const employee =
          employees.find((item) => item.id === payload["employeeId"]) ?? employees[0];
        const assignedTo =
          employees.find((item) => item.id === payload["assignedToEmployeeId"]) ?? null;

        return buildEmployeeLifecycleChecklistListItem(employee, assignedTo, {
          id: "lifecycle-2",
          checklistType: String(payload["checklistType"] ?? "OFFBOARDING"),
          title: String(payload["title"] ?? "New lifecycle task"),
          status: "PENDING",
          dueDate:
            payload["dueDate"] === undefined ? null : String(payload["dueDate"]),
          notes: payload["notes"] === undefined ? null : String(payload["notes"]),
        });
      },
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-lifecycle-checklists",
      heading: "التهيئة وإنهاء الخدمة",
    });

    await expectCardsCount(page, "lifecycle-card", 1);
    await page
      .getByRole("button", { name: "إضافة مهمة تهيئة أو إنهاء خدمة" })
      .evaluate((element) => (element as HTMLButtonElement).click());

    await fillEmployeeLifecycleChecklistForm(page, {
      employeeId: "emp-2",
      checklistType: "OFFBOARDING",
      title: "تسليم العهدة وختم المخالصة",
      assignedToEmployeeId: "emp-1",
      dueDate: "2026-04-12",
      notes: "بالتنسيق مع الشؤون المالية",
      submit: true,
    });

    await expectCardsCount(page, "lifecycle-card", 2);
    await expectTextVisible(page, "تسليم العهدة وختم المخالصة");

    const payload = lifecycleApi.getLastCreatePayload();
    expect(payload?.["employeeId"]).toBe("emp-2");
    expect(payload?.["checklistType"]).toBe("OFFBOARDING");
    expect(payload?.["assignedToEmployeeId"]).toBe("emp-1");
    expect(payload?.["status"]).toBeUndefined();
  });

  test("validates required title before sending request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeLifecycleChecklistsCrud);

    const employees = buildEmployeeFixtures(1);

    const lifecycleApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employee-lifecycle-checklists**",
      initialItems: [],
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-lifecycle-checklists",
      heading: "التهيئة وإنهاء الخدمة",
    });

    await page
      .getByRole("button", { name: "إضافة مهمة تهيئة أو إنهاء خدمة" })
      .evaluate((element) => (element as HTMLButtonElement).click());

    await fillEmployeeLifecycleChecklistForm(page, {
      employeeId: "emp-1",
      submit: true,
    });

    await expectValidationMessage(page, "عنوان المهمة مطلوب.");
    expect(lifecycleApi.getPostCount()).toBe(0);
  });

  test("supports workflow transitions and due alerts", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeLifecycleChecklistsCrud);

    const employees = buildEmployeeFixtures(2);

    await mockCrudList({
      page,
      urlPattern: "**/backend/employee-lifecycle-checklists**",
      initialItems: [
        buildEmployeeLifecycleChecklistListItem(employees[0], employees[1], {
          id: "lifecycle-3",
          title: "تسليم البريد المؤسسي",
          status: "PENDING",
          dueDate: "2026-04-02T00:00:00.000Z",
        }),
      ],
    });

    await page.route("**/backend/employee-lifecycle-checklists/lifecycle-3/start", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildEmployeeLifecycleChecklistListItem(employees[0], employees[1], {
            id: "lifecycle-3",
            title: "تسليم البريد المؤسسي",
            status: "IN_PROGRESS",
            dueDate: "2026-04-02T00:00:00.000Z",
          }),
        ),
      });
    });

    await page.route("**/backend/employee-lifecycle-checklists/lifecycle-3/complete", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildEmployeeLifecycleChecklistListItem(employees[0], employees[1], {
            id: "lifecycle-3",
            title: "تسليم البريد المؤسسي",
            status: "COMPLETED",
            dueDate: "2026-04-02T00:00:00.000Z",
            completedAt: "2026-04-01T12:00:00.000Z",
          }),
        ),
      });
    });

    await page.route(
      "**/backend/employee-lifecycle-checklists/generate-due-alerts",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            scannedCount: 1,
            generatedCount: 2,
            daysThreshold: 3,
          }),
        });
      },
    );

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-lifecycle-checklists",
      heading: "التهيئة وإنهاء الخدمة",
    });

    await expect(page.getByTestId("lifecycle-card")).toContainText("تستحق خلال");
    await page.getByRole("button", { name: "بدء التنفيذ" }).click();
    await expect(page.getByTestId("lifecycle-workflow-message")).toContainText(
      'تم بدء تنفيذ المهمة "تسليم البريد المؤسسي".',
    );

    await page.getByRole("button", { name: "إكمال" }).click();
    await expect(page.getByTestId("lifecycle-workflow-message")).toContainText(
      'تم إكمال المهمة "تسليم البريد المؤسسي".',
    );

    await page.getByTestId("generate-lifecycle-due-alerts").click();
    await expect(page.getByTestId("lifecycle-due-alerts-message")).toContainText(
      "تم فحص 1 مهمة وإنشاء 2 تنبيهًا ضمن نافذة 3 أيام.",
    );
  });

  test("generates built-in checklist templates and skips same-day duplicates", async ({
    page,
  }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeLifecycleChecklistsCrud);

    const employees = buildEmployeeFixtures(2);
    let items: ReturnType<typeof buildEmployeeLifecycleChecklistListItem>[] = [];
    let generateCalls = 0;
    let lastTemplatePayload: Record<string, unknown> | null = null;

    await page.route("**/backend/employee-lifecycle-checklists**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (
        request.method() === "POST" &&
        url.pathname.endsWith("/employee-lifecycle-checklists/generate-templates")
      ) {
        generateCalls += 1;
        lastTemplatePayload = JSON.parse(request.postData() ?? "{}") as Record<
          string,
          unknown
        >;

        const generatedTitles = [
          "تفعيل البريد المؤسسي وحسابات الأنظمة",
          "استلام العقد والهوية الوظيفية",
          "جلسة تعريف بالسياسات واللوائح",
          "اجتماع التهيئة مع المدير المباشر وخطة الأسبوع الأول",
        ];
        const employee =
          employees.find((item) => item.id === lastTemplatePayload?.["employeeId"]) ??
          employees[0];
        const assignee =
          employees.find(
            (item) => item.id === lastTemplatePayload?.["assignedToEmployeeId"],
          ) ?? null;

        if (generateCalls === 1) {
          items = generatedTitles.map((title, index) =>
            buildEmployeeLifecycleChecklistListItem(employee, assignee, {
              id: `lifecycle-template-${index + 1}`,
              checklistType: "ONBOARDING",
              title,
              dueDate: `2026-04-0${index + 2}T00:00:00.000Z`,
              notes: "تم إنشاؤها من القالب الافتراضي",
            }),
          );
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            employeeId: lastTemplatePayload?.["employeeId"],
            checklistType: lastTemplatePayload?.["checklistType"],
            generatedCount: generateCalls === 1 ? items.length : 0,
            skippedCount: generateCalls === 1 ? 0 : generatedTitles.length,
            templateCount: generatedTitles.length,
            items: generateCalls === 1 ? items : [],
          }),
        });
        return;
      }

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: items,
            pagination: {
              page: 1,
              limit: 12,
              total: items.length,
              totalPages: 1,
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ message: "Not found" }),
      });
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-lifecycle-checklists",
      heading: "التهيئة وإنهاء الخدمة",
    });

    await expect(page.getByTestId("lifecycle-card")).toHaveCount(0);

    await page.getByTestId("generate-lifecycle-templates").click();
    await page
      .getByTestId("lifecycle-template-form-employee")
      .selectOption("emp-2");
    await page
      .getByTestId("lifecycle-template-form-type")
      .selectOption("ONBOARDING");
    await page
      .getByTestId("lifecycle-template-form-assignee")
      .selectOption("emp-1");
    await page.getByTestId("lifecycle-template-form-submit").click();

    await expect(page.getByTestId("lifecycle-template-message")).toContainText(
      "تم إنشاء 4 مهمة افتراضية",
    );
    await expect(page.getByTestId("lifecycle-card")).toHaveCount(4);
    await expectTextVisible(page, "تفعيل البريد المؤسسي وحسابات الأنظمة");

    await page.getByTestId("generate-lifecycle-templates").click();
    await page
      .getByTestId("lifecycle-template-form-employee")
      .selectOption("emp-2");
    await page
      .getByTestId("lifecycle-template-form-type")
      .selectOption("ONBOARDING");
    await page
      .getByTestId("lifecycle-template-form-assignee")
      .selectOption("emp-1");
    await page.getByTestId("lifecycle-template-form-submit").click();

    await expect(page.getByTestId("lifecycle-template-message")).toContainText(
      "تم إنشاء 0 مهمة افتراضية وتخطي 4 مهمة موجودة مسبقًا",
    );
    await expect(page.getByTestId("lifecycle-card")).toHaveCount(4);

    expect(generateCalls).toBe(2);
    expect(lastTemplatePayload?.["employeeId"]).toBe("emp-2");
    expect(lastTemplatePayload?.["checklistType"]).toBe("ONBOARDING");
    expect(lastTemplatePayload?.["assignedToEmployeeId"]).toBe("emp-1");
  });
});
