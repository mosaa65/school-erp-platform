import { expect, test, type Page, type Route } from "@playwright/test";
import { injectAuthSession } from "./helpers/auth-session";
import { e2ePermissionSets } from "./helpers/permissions";
import { expectTextVisible, openModulePage } from "./helpers/ui-assertions";

type JsonObject = Record<string, unknown>;

test.describe("finance hybrid branch coverage", () => {
  test("shows shared student invoices alongside branch-filtered results", async ({
    page,
  }) => {
    await injectAuthSession(page, e2ePermissionSets.financeSmokeRead);

    await page.route("**/backend/finance/student-invoices**", async (route) => {
      const url = new URL(route.request().url());
      const branchId = url.searchParams.get("branchId");
      const items =
        branchId === "1"
          ? [buildStudentInvoice({ id: "shared", number: "INV-SHARED-001", branchId: null }), buildStudentInvoice({ id: "local", number: "INV-LOCAL-001", branchId: 1, branchName: "فرع الرياض" })]
          : [
              buildStudentInvoice({ id: "shared", number: "INV-SHARED-001", branchId: null }),
              buildStudentInvoice({ id: "local", number: "INV-LOCAL-001", branchId: 1, branchName: "فرع الرياض" }),
              buildStudentInvoice({ id: "foreign", number: "INV-FOREIGN-001", branchId: 2, branchName: "فرع جدة" }),
            ];

      await fulfillPaginated(route, items);
    });

    await openModulePage({
      page,
      path: "/app/student-invoices",
      heading: "فواتير الطلاب",
      headingLevel: 1,
    });

    await page.getByRole("button", { name: "فلترة" }).click();
    await page.getByPlaceholder("معرّف الفرع").fill("1");
    await page.getByRole("button", { name: "تطبيق" }).click();

    await expectTextVisible(page, "INV-LOCAL-001");
    await expectTextVisible(page, "INV-SHARED-001");
    await expectTextVisible(page, "الفرع: كافة الفروع");
    await expect(page.getByText("INV-FOREIGN-001")).toHaveCount(0);
  });

  test("renders shared labels for budgets and cost centers", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.financeSmokeRead);

    await page.route("**/backend/finance/budgets**", async (route) => {
      await fulfillPaginated(route, [
        {
          id: 10,
          nameAr: "ميزانية تشغيل مشتركة",
          fiscalYearId: 1,
          branchId: null,
          budgetType: "ANNUAL",
          startDate: "2054-01-01",
          endDate: "2054-12-31",
          totalAmount: 250000,
          status: "APPROVED",
          approvedByUserId: "user-1",
          approvedAt: "2054-01-02T00:00:00.000Z",
          notes: null,
          createdByUserId: "user-1",
          createdAt: "2054-01-01T00:00:00.000Z",
          updatedAt: null,
          fiscalYear: { id: 1, yearName: "2054" },
          branch: null,
          createdByUser: { id: "user-1", email: "finance@school.local" },
        },
      ]);
    });

    await page.route("**/backend/finance/cost-centers**", async (route) => {
      await fulfillPaginated(route, [
        {
          id: 20,
          code: "CC-SHARED",
          nameAr: "مركز تكلفة مشترك",
          nameEn: null,
          parentId: null,
          branchId: null,
          managerEmployeeId: null,
          isActive: true,
          createdAt: "2054-01-01T00:00:00.000Z",
          updatedAt: null,
          parent: null,
          branch: null,
          managerEmployee: null,
          children: [],
        },
      ]);
    });

    await openModulePage({
      page,
      path: "/app/budgets",
      heading: "الميزانيات",
    });
    await expectTextVisible(page, "الفرع: كافة الفروع");

    await openModulePage({
      page,
      path: "/app/cost-centers",
      heading: "مراكز التكلفة",
    });
    await expectTextVisible(page, "الفرع: كافة الفروع");
  });

  test("renders shared scope label for chart of accounts", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.financeSmokeRead);

    await page.route("**/backend/finance/chart-of-accounts**", async (route) => {
      await fulfillPaginated(route, [
        {
          id: 30,
          accountCode: "4000",
          nameAr: "إيراد مشترك",
          nameEn: null,
          accountType: "REVENUE",
          parentId: null,
          isHeader: false,
          isBankAccount: false,
          defaultCurrencyId: null,
          branchId: null,
          normalBalance: "CREDIT",
          isActive: true,
          createdAt: "2054-01-01T00:00:00.000Z",
          updatedAt: "2054-01-01T00:00:00.000Z",
          parent: null,
        },
      ]);
    });

    await openModulePage({
      page,
      path: "/app/chart-of-accounts",
      heading: "دليل الحسابات",
    });

    await expectTextVisible(page, "النطاق: كافة الفروع");
  });
});

async function fulfillPaginated(route: Route, items: JsonObject[]) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      data: items,
      pagination: {
        page: 1,
        limit: 20,
        total: items.length,
        totalPages: 1,
      },
    }),
  });
}

function buildStudentInvoice(input: {
  id: string;
  number: string;
  branchId: number | null;
  branchName?: string;
}): JsonObject {
  return {
    id: input.id,
    invoiceNumber: input.number,
    enrollmentId: "enr-1",
    academicYearId: "ay-2054",
    branchId: input.branchId,
    invoiceDate: "2054-02-01",
    dueDate: "2054-03-01",
    subtotal: 1000,
    discountAmount: 0,
    vatAmount: 0,
    totalAmount: 1000,
    paidAmount: 0,
    balanceDue: 1000,
    currencyId: 1,
    status: "ISSUED",
    notes: null,
    createdAt: "2054-02-01T00:00:00.000Z",
    updatedAt: null,
    enrollment: {
      id: "enr-1",
      studentId: "stu-1",
      sectionId: "sec-1",
      student: {
        id: "stu-1",
        fullName: "طالب تجريبي",
      },
    },
    academicYear: {
      id: "ay-2054",
      name: "العام 2054",
    },
    branch:
      input.branchId === null
        ? null
        : {
            id: input.branchId,
            nameAr: input.branchName ?? `فرع ${input.branchId}`,
          },
    currency: {
      id: 1,
      code: "SAR",
      nameAr: "ريال سعودي",
    },
    createdByUser: {
      id: "user-1",
      email: "finance@school.local",
    },
  };
}
