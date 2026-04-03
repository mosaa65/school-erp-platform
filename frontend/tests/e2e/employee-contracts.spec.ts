import { expect, test } from "@playwright/test";
import { mockCrudList, mockEmployeesOptions } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { buildEmployeeFixtures } from "./helpers/fixtures";
import { fillEmployeeContractForm } from "./helpers/form-actions";
import { buildEmployeeContractListItem } from "./helpers/list-item-builders";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectTextVisible,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

test.describe("Employee Contracts", () => {
  test("loads list and creates a new contract", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeContractsCrud);

    const employees = buildEmployeeFixtures(2);

    const contractsApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employee-contracts**",
      initialItems: [buildEmployeeContractListItem(employees[0])],
      onCreate: (payload) => {
        const employee =
          employees.find((item) => item.id === payload["employeeId"]) ?? employees[0];

        return buildEmployeeContractListItem(employee, {
          id: "contract-2",
          employeeId: String(payload["employeeId"] ?? employee.id),
          contractTitle: String(payload["contractTitle"] ?? "New Contract"),
          contractNumber:
            payload["contractNumber"] === undefined
              ? null
              : String(payload["contractNumber"]),
          contractStartDate: String(payload["contractStartDate"] ?? "2026-02-01T00:00:00.000Z"),
          contractEndDate:
            payload["contractEndDate"] === undefined
              ? null
              : String(payload["contractEndDate"]),
          salaryAmount:
            payload["salaryAmount"] === undefined ? null : String(payload["salaryAmount"]),
          notes: payload["notes"] === undefined ? null : String(payload["notes"]),
          isCurrent: payload["isCurrent"] === undefined ? true : Boolean(payload["isCurrent"]),
          isActive: payload["isActive"] === undefined ? true : Boolean(payload["isActive"]),
        });
      },
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-contracts",
      heading: "عقود الموظفين",
    });

    await expectCardsCount(page, "contract-card", 1);
    await page
      .getByRole("button", { name: "إنشاء عقد" })
      .evaluate((element) => (element as HTMLButtonElement).click());

    await fillEmployeeContractForm(page, {
      employeeId: "emp-2",
      contractTitle: "Supervisor Annual Contract",
      contractNumber: "CNT-2026-014",
      contractStartDate: "2026-02-01",
      contractEndDate: "2026-12-31",
      salaryAmount: "135000",
      notes: "Renew after Q4 review",
      submit: true,
    });

    await expectCardsCount(page, "contract-card", 2);
    await expectTextVisible(page, "Supervisor Annual Contract");

    const lastCreatePayload = contractsApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["employeeId"]).toBe("emp-2");
    expect(lastCreatePayload?.["contractTitle"]).toBe("Supervisor Annual Contract");
    expect(lastCreatePayload?.["salaryAmount"]).toBe("135000");
  });

  test("validates required start date before sending request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeContractsCrud);

    const employees = buildEmployeeFixtures(1);

    const contractsApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employee-contracts**",
      initialItems: [],
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-contracts",
      heading: "عقود الموظفين",
    });

    await page
      .getByRole("button", { name: "إنشاء عقد" })
      .evaluate((element) => (element as HTMLButtonElement).click());

    await fillEmployeeContractForm(page, {
      employeeId: "emp-1",
      contractTitle: "Teacher Contract",
      submit: true,
    });

    await expectValidationMessage(page, "تاريخ بداية العقد مطلوب.");
    expect(contractsApi.getPostCount()).toBe(0);
  });

  test("generates expiry alerts for contracts nearing end date", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeContractsCrud);

    const employees = buildEmployeeFixtures(1);

    await mockCrudList({
      page,
      urlPattern: "**/backend/employee-contracts**",
      initialItems: [
        buildEmployeeContractListItem(employees[0], {
          id: "contract-expiring",
          contractTitle: "Near Expiry Contract",
          contractEndDate: "2026-04-20T00:00:00.000Z",
        }),
      ],
    });

    await page.route("**/backend/employee-contracts/generate-expiry-alerts", async (route) => {
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
      path: "/app/employee-contracts",
      heading: "عقود الموظفين",
    });

    await expect(page.getByTestId("contract-card")).toContainText("ينتهي خلال");
    await page.getByTestId("generate-contract-expiry-alerts").click();
    await expect(page.getByTestId("contract-expiry-alerts-message")).toContainText(
      "تم فحص 1 عقدًا وإنشاء 2 تنبيهًا ضمن نافذة 30 يوم.",
    );
  });

  test("starts a renewal draft from an existing contract", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.employeeContractsCrud);

    const employees = buildEmployeeFixtures(1);

    const contractsApi = await mockCrudList({
      page,
      urlPattern: "**/backend/employee-contracts**",
      initialItems: [
        buildEmployeeContractListItem(employees[0], {
          id: "contract-renew-source",
          contractTitle: "Math Teacher Contract",
          contractStartDate: "2026-01-01T00:00:00.000Z",
          contractEndDate: "2026-12-31T00:00:00.000Z",
          salaryAmount: "90000",
          notes: "Primary annual contract",
        }),
      ],
      onCreate: () => ({
        ...buildEmployeeContractListItem(employees[0], {
          id: "contract-renewed",
          employeeId: employees[0]?.id ?? "emp-1",
          contractTitle: "Math Teacher Contract",
          contractStartDate: "2027-01-01T00:00:00.000Z",
          salaryAmount: "90000",
          notes: "مسودة تجديد منشأة من العقد السابق: CNT-2026-001. Primary annual contract",
          isCurrent: false,
          isActive: true,
        }),
        contractNumber: null,
        contractEndDate: null,
      }),
      onUpdate: (payload, context) => ({
        ...context.item,
        contractTitle: String(payload["contractTitle"] ?? context.item.contractTitle),
        contractNumber:
          payload["contractNumber"] === undefined
            ? context.item.contractNumber
            : String(payload["contractNumber"]),
        contractStartDate: String(
          payload["contractStartDate"] ?? context.item.contractStartDate,
        ),
        contractEndDate:
          payload["contractEndDate"] === undefined
            ? context.item.contractEndDate
            : String(payload["contractEndDate"]),
        salaryAmount:
          payload["salaryAmount"] === undefined
            ? context.item.salaryAmount
            : String(payload["salaryAmount"]),
        notes:
          payload["notes"] === undefined
            ? context.item.notes
            : String(payload["notes"]),
        isCurrent:
          payload["isCurrent"] === undefined
            ? context.item.isCurrent
            : Boolean(payload["isCurrent"]),
        isActive:
          payload["isActive"] === undefined
            ? context.item.isActive
            : Boolean(payload["isActive"]),
      }),
    });

    await mockEmployeesOptions(page, employees);

    await openModulePage({
      page,
      path: "/app/employee-contracts",
      heading: "عقود الموظفين",
    });

    const renewalRequestPromise = page.waitForRequest(
      "**/backend/employee-contracts/contract-renew-source/renew-draft",
    );
    await page.getByTestId("contract-renew-button-contract-renew-source").click();
    const renewalRequest = await renewalRequestPromise;

    expect(renewalRequest.method()).toBe("POST");
    await expect(page.getByTestId("contract-renewal-banner")).toContainText(
      "Math Teacher Contract",
    );
    await expect(page.getByTestId("contract-form-start-date")).toHaveValue("2027-01-01");
    await expect(page.getByTestId("contract-form-number")).toHaveValue("");
    await expect(page.getByTestId("contract-form-salary")).toHaveValue("90000");
    await expect(page.getByTestId("contract-form-current")).not.toBeChecked();
    await expect(page.getByTestId("contract-form-notes")).toHaveValue(
      /مسودة تجديد منشأة من العقد السابق/,
    );

    await fillEmployeeContractForm(page, {
      contractTitle: "Math Teacher Contract 2027",
      contractNumber: "CNT-2027-001",
      contractEndDate: "2027-12-31",
      isCurrent: true,
      submit: true,
    });

    await expectCardsCount(page, "contract-card", 2);
    await expectTextVisible(page, "Math Teacher Contract 2027");

    const lastCreatePayload = contractsApi.getLastCreatePayload();
    const lastUpdatePayload = contractsApi.getLastUpdatePayload();
    expect(lastCreatePayload).toEqual({});
    expect(lastUpdatePayload?.["contractTitle"]).toBe("Math Teacher Contract 2027");
    expect(lastUpdatePayload?.["employeeId"]).toBe("emp-1");
    expect(lastUpdatePayload?.["contractStartDate"]).toBe("2027-01-01T00:00:00.000Z");
    expect(lastUpdatePayload?.["contractNumber"]).toBe("CNT-2027-001");
    expect(lastUpdatePayload?.["isCurrent"]).toBe(true);
  });
});
