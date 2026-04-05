import { expect, test } from "@playwright/test";
import { mockCrudList, mockEmployeesOptions } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { buildEmployeeFixtures } from "./helpers/fixtures";
import { fillEmployeeDocumentForm } from "./helpers/form-actions";
import { buildEmployeeDocumentListItem } from "./helpers/list-item-builders";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectTextVisible,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

test.describe("Employee Documents", () => {
  test("loads list and creates a new document", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeDocumentsCrud);

    const employees = buildEmployeeFixtures(2);

    const documentsApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employee-documents**",
      initialItems: [buildEmployeeDocumentListItem(employees[0])],
      onCreate: (payload) => {
        const employee =
          employees.find((item) => item.id === payload["employeeId"]) ?? employees[0];

        return buildEmployeeDocumentListItem(employee, {
          id: "9002",
          employeeId: String(payload["employeeId"] ?? employee.id),
          fileName: String(payload["fileName"] ?? "Employee Document"),
          filePath: String(payload["filePath"] ?? "/storage/hr/document.pdf"),
          fileType: payload["fileType"] === undefined ? null : String(payload["fileType"]),
          fileSize: payload["fileSize"] === undefined ? null : Number(payload["fileSize"]),
          fileCategory:
            payload["fileCategory"] === undefined ? null : String(payload["fileCategory"]),
          description:
            payload["description"] === undefined ? null : String(payload["description"]),
          expiresAt:
            payload["expiresAt"] === undefined ? null : String(payload["expiresAt"]),
        });
      },
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-documents",
      heading: "مستندات الموظفين",
    });

    await expectCardsCount(page, "document-card", 1);

    await page
      .getByRole("button", { name: "إنشاء مستند" })
      .evaluate((element) => (element as HTMLButtonElement).click());

    await fillEmployeeDocumentForm(page, {
      employeeId: "emp-2",
      fileName: "Employment Decision.pdf",
      filePath: "https://cdn.school.local/hr/employees/emp-2/employment-decision.pdf",
      fileType: "application/pdf",
      fileSize: "128000",
      fileCategory: "قرار تعيين",
      description: "النسخة المعتمدة من قرار التعيين",
      expiresAt: "2027-01-15",
      submit: true,
    });

    await expectCardsCount(page, "document-card", 2);
    await expectTextVisible(page, "Employment Decision.pdf");

    const lastCreatePayload = documentsApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["employeeId"]).toBe("emp-2");
    expect(lastCreatePayload?.["fileName"]).toBe("Employment Decision.pdf");
    expect(lastCreatePayload?.["fileCategory"]).toBe("قرار تعيين");
    expect(lastCreatePayload?.["expiresAt"]).toBe("2027-01-15T00:00:00.000Z");
  });

  test("validates required file path before sending request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeDocumentsCrud);

    const employees = buildEmployeeFixtures(1);

    const documentsApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employee-documents**",
      initialItems: [],
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-documents",
      heading: "مستندات الموظفين",
    });

    await page
      .getByRole("button", { name: "إنشاء مستند" })
      .evaluate((element) => (element as HTMLButtonElement).click());

    await fillEmployeeDocumentForm(page, {
      employeeId: "emp-1",
      fileName: "National ID.pdf",
      submit: true,
    });

    await expectValidationMessage(page, "مسار الملف أو رابطه مطلوب.");
    expect(documentsApi.getPostCount()).toBe(0);
  });

  test("generates expiry alerts for documents nearing expiration", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeDocumentsCrud);

    const employees = buildEmployeeFixtures(1);

    await mockCrudList({
      page,
      urlPattern: "**/backend/employee-documents**",
      initialItems: [
        buildEmployeeDocumentListItem(employees[0], {
          id: "9003",
          fileName: "National ID.pdf",
          fileCategory: "هوية",
          expiresAt: "2026-04-18T00:00:00.000Z",
        }),
      ],
    });

    await page.route("**/backend/employee-documents/generate-expiry-alerts", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          scannedCount: 1,
          generatedCount: 2,
          daysThreshold: 30,
        }),
      });
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-documents",
      heading: "مستندات الموظفين",
    });

    await expect(page.getByTestId("document-card")).toContainText("تنتهي خلال");
    await page.getByTestId("generate-document-expiry-alerts").click();
    await expect(page.getByTestId("document-expiry-alerts-message")).toContainText(
      "تم فحص 1 مستندًا وإنشاء 2 تنبيهًا ضمن نافذة 30 يوم.",
    );
  });

  test("requires expiry date for compliance-sensitive document categories", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeDocumentsCrud);

    const employees = buildEmployeeFixtures(1);

    const documentsApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employee-documents**",
      initialItems: [],
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-documents",
      heading: "مستندات الموظفين",
    });

    await page
      .getByRole("button", { name: "إنشاء مستند" })
      .evaluate((element) => (element as HTMLButtonElement).click());

    await fillEmployeeDocumentForm(page, {
      employeeId: "emp-1",
      fileName: "National ID.pdf",
      filePath: "https://cdn.school.local/hr/employees/emp-1/national-id.pdf",
      fileCategory: "هوية",
      submit: true,
    });

    await expectValidationMessage(page, "تاريخ الصلاحية مطلوب لهذا النوع من المستندات.");
    expect(documentsApi.getPostCount()).toBe(0);
  });
});
