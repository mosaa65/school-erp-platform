import { expect, test, type Locator, type Page, type Route } from "@playwright/test";
import { mockListWithPost } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectTextVisible,
  openModulePage,
} from "./helpers/ui-assertions";

type JsonObject = Record<string, unknown>;

test.describe("finance deep flows", () => {
  test("creates a student invoice and validates required invoice dates", async ({
    page,
  }) => {
    await signInWithFinanceCrud(page);

    const invoicesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/finance/student-invoices**",
      initialItems: [
        buildStudentInvoiceListItem({
          id: "inv-existing",
          invoiceNumber: "INV-2054-1001",
          studentName: "أحمد علي",
        }),
      ],
      listLimit: 10,
      onCreate: (payload, context) =>
        buildStudentInvoiceListItem({
          id: `inv-created-${context.postCount}`,
          invoiceNumber:
            String(payload.invoiceNumber ?? "").trim() ||
            `INV-2054-NEW-${context.postCount}`,
          studentName: "فاتورة جديدة",
          enrollmentId: String(payload.enrollmentId ?? "enr-new"),
          academicYearId: String(payload.academicYearId ?? "ay-new"),
          branchId: Number(payload.branchId ?? 1),
          currencyId: Number(payload.currencyId ?? 1),
          invoiceDate: String(payload.invoiceDate ?? "2054-02-15"),
          dueDate: String(payload.dueDate ?? "2054-03-01"),
          status: String(payload.status ?? "DRAFT"),
          totalAmount: Number(
            (((payload.lines as JsonObject[] | undefined) ?? [])[0]
              ?.unitPrice as number | string | undefined) ?? 0,
          ),
          balanceDue: Number(
            (((payload.lines as JsonObject[] | undefined) ?? [])[0]
              ?.unitPrice as number | string | undefined) ?? 0,
          ),
        }),
    });

    await openModulePage({
      page,
      path: "/app/student-invoices",
      heading: "فواتير الطلاب",
      headingLevel: 1,
    });

    await openFinanceFab(page, "إضافة فاتورة");
    const form = page.locator("form").last();
    await form.getByPlaceholder("enrollmentId").fill("enr-2054-2");
    await form.getByPlaceholder("academicYearId").fill("ay-2054");
    await form.getByRole("button", { name: "إضافة فاتورة" }).click();

    await expectFieldInvalid(form.locator('input[type="date"]').nth(0));
    await expectFieldInvalid(form.locator('input[type="date"]').nth(1));
    expect(invoicesApi.getPostCount()).toBe(0);

    await form.getByPlaceholder("INV-2026-0001").fill("INV-2054-2002");
    await form.locator('input[type="date"]').nth(0).fill("2054-02-15");
    await form.locator('input[type="date"]').nth(1).fill("2054-03-01");
    await form.getByPlaceholder("وصف البند").fill("رسوم تسجيل");
    await form.locator('input[type="number"]').nth(3).fill("850");

    await form.getByRole("button", { name: "إضافة فاتورة" }).click();

    await expectTextVisible(page, "INV-2054-2002");
    await expect(page.getByText(/النتائج:\s*2/)).toBeVisible();

    const lastCreatePayload = invoicesApi.getLastCreatePayload();
    expect(lastCreatePayload?.invoiceNumber).toBe("INV-2054-2002");
    expect(lastCreatePayload?.enrollmentId).toBe("enr-2054-2");
    expect(lastCreatePayload?.academicYearId).toBe("ay-2054");
  });

  test("creates an invoice installment and validates missing invoice id", async ({
    page,
  }) => {
    await signInWithFinanceCrud(page);

    const installmentsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/finance/invoice-installments**",
      initialItems: [
        buildInvoiceInstallmentListItem({
          id: "inst-1",
          invoiceId: "inv-1",
          invoiceNumber: "INV-2054-1001",
        }),
      ],
      onCreate: (payload, context) =>
        buildInvoiceInstallmentListItem({
          id: `inst-created-${context.postCount}`,
          invoiceId: String(payload.invoiceId ?? "inv-created"),
          invoiceNumber: "INV-2054-2002",
          installmentNumber: Number(payload.installmentNumber ?? 1),
          dueDate: String(payload.dueDate ?? "2054-04-01"),
          amount: Number(payload.amount ?? 0),
          paidAmount: Number(payload.paidAmount ?? 0),
          status: String(payload.status ?? "PENDING"),
          lateFee: Number(payload.lateFee ?? 0),
        }),
    });

    await openModulePage({
      page,
      path: "/app/invoice-installments",
      heading: "تقسيط الفواتير",
      headingLevel: 1,
    });

    await openFinanceFab(page, "إضافة قسط");
    const form = page.locator("form").last();
    await form.locator('input[type="date"]').nth(0).fill("2054-04-01");
    await form.locator('input[type="number"]').nth(1).fill("500");
    await form.getByRole("button", { name: "إضافة قسط" }).click();

    await expectFieldInvalid(form.getByPlaceholder("invoiceId"));
    expect(installmentsApi.getPostCount()).toBe(0);

    await form.getByPlaceholder("invoiceId").fill("inv-2054-2002");
    await form.getByRole("button", { name: "إضافة قسط" }).click();

    await expectTextVisible(page, "INV-2054-2002");
    await expect(page.getByText(/الإجمالي:\s*2/)).toBeVisible();

    const lastCreatePayload = installmentsApi.getLastCreatePayload();
    expect(lastCreatePayload?.invoiceId).toBe("inv-2054-2002");
    expect(lastCreatePayload?.amount).toBe(500);
  });

  test("creates a fee structure and validates required fields", async ({
    page,
  }) => {
    await signInWithFinanceCrud(page);

    const feeStructuresApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/finance/fee-structures**",
      initialItems: [
        buildFeeStructureListItem({
          id: 1,
          nameAr: "رسوم الصف الأول",
        }),
      ],
      listLimit: 24,
      onCreate: (payload, context) =>
        buildFeeStructureListItem({
          id: 100 + context.postCount,
          nameAr: String(payload.nameAr ?? "هيكل جديد"),
          academicYearId: String(payload.academicYearId ?? "ay-2054"),
          gradeLevelId: String(payload.gradeLevelId ?? "gl-1"),
          feeType: String(payload.feeType ?? "TUITION"),
          amount: Number(payload.amount ?? 0),
          currencyId: Number(payload.currencyId ?? 1),
          vatRate: Number(payload.vatRate ?? 0),
          isActive: payload.isActive !== false,
        }),
    });

    await openModulePage({
      page,
      path: "/app/fee-structures",
      heading: "هياكل الرسوم",
      headingLevel: 1,
    });

    await openFinanceFab(page, "إضافة هيكل رسوم");
    const form = page.locator("form").last();
    await form.getByRole("button", { name: "إضافة هيكل" }).click();

    await expectFieldInvalid(form.getByPlaceholder("معرّف السنة الأكاديمية"));
    expect(feeStructuresApi.getPostCount()).toBe(0);

    await form.getByPlaceholder("معرّف السنة الأكاديمية").fill("ay-2054");
    await form.getByPlaceholder("اسم الهيكل").fill("رسوم النقل الصباحية");
    await form.locator('input[type="number"]').nth(0).fill("1200");
    await form.getByPlaceholder("معرّف العملة (اختياري)").fill("1");
    await form.getByRole("button", { name: "إضافة هيكل" }).click();

    await expectTextVisible(page, "رسوم النقل الصباحية");
    await expect(page.getByText("إجمالي الهياكل: 2")).toBeVisible();

    const lastCreatePayload = feeStructuresApi.getLastCreatePayload();
    expect(lastCreatePayload?.academicYearId).toBe("ay-2054");
    expect(lastCreatePayload?.nameAr).toBe("رسوم النقل الصباحية");
    expect(lastCreatePayload?.amount).toBe(1200);
  });

  test("creates a discount rule and validates required fields", async ({
    page,
  }) => {
    await signInWithFinanceCrud(page);

    const discountRulesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/finance/discount-rules**",
      initialItems: [
        buildDiscountRuleListItem({
          id: 1,
          nameAr: "خصم الأشقاء",
        }),
      ],
      listLimit: 24,
      onCreate: (payload, context) =>
        buildDiscountRuleListItem({
          id: 200 + context.postCount,
          nameAr: String(payload.nameAr ?? "قاعدة جديدة"),
          discountType: String(payload.discountType ?? "CUSTOM"),
          calculationMethod: String(payload.calculationMethod ?? "FIXED"),
          value: Number(payload.value ?? 0),
          appliesToFeeType: String(payload.appliesToFeeType ?? "ALL"),
          requiresApproval: payload.requiresApproval === true,
          academicYearId: String(payload.academicYearId ?? "ay-2054"),
          isActive: payload.isActive !== false,
        }),
    });

    await openModulePage({
      page,
      path: "/app/discount-rules",
      heading: "قواعد الخصومات",
      headingLevel: 1,
    });

    await openFinanceFab(page, "إضافة قاعدة خصم");
    const form = page.locator("form").last();
    await form.getByRole("button", { name: "إضافة قاعدة" }).click();

    await expectFieldInvalid(form.getByPlaceholder("اسم قاعدة الخصم"));
    expect(discountRulesApi.getPostCount()).toBe(0);

    await form.getByPlaceholder("اسم قاعدة الخصم").fill("خصم دعم المتفوقين");
    await form.locator('input[type="number"]').first().fill("20");
    await form.getByPlaceholder("معرّف السنة (اختياري)").fill("ay-2054");
    await form.getByRole("button", { name: "إضافة قاعدة" }).click();

    await expectTextVisible(page, "خصم دعم المتفوقين");
    await expect(page.getByText("إجمالي القواعد: 2")).toBeVisible();

    const lastCreatePayload = discountRulesApi.getLastCreatePayload();
    expect(lastCreatePayload?.nameAr).toBe("خصم دعم المتفوقين");
    expect(lastCreatePayload?.value).toBe(20);
  });

  test("updates bank reconciliation status from open to reconciled", async ({
    page,
  }) => {
    await signInWithFinanceCrud(page);

    const bankApi = await mockBankReconciliationsPatch(page, {
      data: [
        buildBankReconciliationItem({
          id: "br-1",
          status: "OPEN",
        }),
      ],
      pagination: {
        page: 1,
        limit: 8,
        total: 1,
        totalPages: 1,
      },
    });

    await openModulePage({
      page,
      path: "/app/bank-reconciliations",
      heading: "مطابقة البنوك",
    });

    await expectTextVisible(page, "مفتوحة");
    await page.getByRole("button", { name: "إغلاق المطابقة" }).click();

    await expectTextVisible(page, "مغلقة");
    expect(bankApi.getPatchCount()).toBe(1);
    expect(bankApi.getLastPatchPayload()).toEqual({ status: "RECONCILED" });
  });

  test("disables adding a discount rule without create permission", async ({
    page,
  }) => {
    const permissionCodes = financeCrudPermissions.filter(
      (code) => code !== "discount-rules.create",
    );
    await injectAuthSession(page, permissionCodes);
    await mockJson(page, "**/backend/finance/discount-rules**", {
      data: [
        buildDiscountRuleListItem({
          id: 1,
          nameAr: "خصم الأشقاء",
        }),
      ],
      pagination: {
        page: 1,
        limit: 24,
        total: 1,
        totalPages: 1,
      },
    });

    await openModulePage({
      page,
      path: "/app/discount-rules",
      heading: "قواعد الخصومات",
      headingLevel: 1,
    });

    await expect(
      page.getByRole("button", { name: "إضافة قاعدة خصم" }),
    ).toBeDisabled();
  });

  test("disables bank reconciliation status actions without update permission", async ({
    page,
  }) => {
    const permissionCodes = financeCrudPermissions.filter(
      (code) => code !== "bank-reconciliations.update",
    );
    await injectAuthSession(page, permissionCodes);

    await mockJson(page, "**/backend/finance/bank-reconciliations**", {
      data: [
        buildBankReconciliationItem({
          id: "br-2",
          status: "OPEN",
        }),
      ],
      pagination: {
        page: 1,
        limit: 8,
        total: 1,
        totalPages: 1,
      },
    });

    await openModulePage({
      page,
      path: "/app/bank-reconciliations",
      heading: "مطابقة البنوك",
    });

    await expect(
      page.getByRole("button", { name: "إغلاق المطابقة" }),
    ).toBeDisabled();
  });
});

const financeCrudPermissions = [
  ...e2ePermissionSets.financeSmokeRead,
  "student-invoices.create",
  "student-invoices.update",
  "student-invoices.delete",
  "invoice-installments.create",
  "invoice-installments.update",
  "invoice-installments.delete",
  "fee-structures.create",
  "fee-structures.update",
  "fee-structures.delete",
  "discount-rules.create",
  "discount-rules.update",
  "discount-rules.delete",
  "bank-reconciliations.update",
] as const;

async function signInWithFinanceCrud(page: Page) {
  await injectAuthSession(page, financeCrudPermissions);
}

async function openFinanceFab(page: Page, ariaLabel: string) {
  const fab = page.getByRole("button", { name: ariaLabel });
  await fab.evaluate((element: HTMLButtonElement) => {
    element.click();
  });
  await expect(page.locator("form").last()).toBeVisible();
}

async function expectFieldInvalid(field: Locator) {
  await expect(field).toBeVisible();
  await expect
    .poll(async () =>
      field.evaluate((element) => {
        if ("checkValidity" in element && typeof element.checkValidity === "function") {
          return !element.checkValidity();
        }
        return element.getAttribute("aria-invalid") === "true";
      }),
    )
    .toBe(true);
}

async function mockJson(page: Page, urlPattern: string, body: JsonObject) {
  await page.route(urlPattern, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

async function mockBankReconciliationsPatch(
  page: Page,
  initialBody: {
    data: ReturnType<typeof buildBankReconciliationItem>[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  },
) {
  const body = {
    data: [...initialBody.data],
    pagination: { ...initialBody.pagination },
  };
  let patchCount = 0;
  let lastPatchPayload: JsonObject | null = null;

  await page.route(
    "**/backend/finance/bank-reconciliations**",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    },
  );

  await page.route(
    "**/backend/finance/bank-reconciliations/*",
    async (route) => {
      if (route.request().method() === "PATCH") {
        patchCount += 1;
        lastPatchPayload = parsePayload(route.request().postData());
        const reconciliationId = route.request().url().split("/").pop();

        body.data = body.data.map((item) =>
          item.id === reconciliationId
            ? {
                ...item,
                status:
                  String(lastPatchPayload?.status ?? item.status) ===
                  "RECONCILED"
                    ? "RECONCILED"
                    : "OPEN",
              }
            : item,
        );

        const updated =
          body.data.find((item) => item.id === reconciliationId) ??
          body.data[0];

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(updated),
        });
        return;
      }

      await route.fallback();
    },
  );

  return {
    getPatchCount: () => patchCount,
    getLastPatchPayload: () => lastPatchPayload,
  };
}

function parsePayload(rawBody: string | null): JsonObject {
  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody) as JsonObject;
  } catch {
    return {};
  }
}

function buildStudentInvoiceListItem(input: {
  id: string;
  invoiceNumber: string;
  studentName: string;
  enrollmentId?: string;
  academicYearId?: string;
  branchId?: number;
  currencyId?: number;
  invoiceDate?: string;
  dueDate?: string;
  status?: string;
  totalAmount?: number;
  balanceDue?: number;
}) {
  return {
    id: input.id,
    invoiceNumber: input.invoiceNumber,
    enrollmentId: input.enrollmentId ?? "enr-1",
    academicYearId: input.academicYearId ?? "ay-1",
    branchId: input.branchId ?? 1,
    currencyId: input.currencyId ?? 1,
    invoiceDate: input.invoiceDate ?? "2054-02-10",
    dueDate: input.dueDate ?? "2054-03-01",
    status: input.status ?? "PARTIAL",
    notes: "رسوم الفصل الأول",
    totalAmount: input.totalAmount ?? 1200,
    balanceDue: input.balanceDue ?? 450,
    branch: {
      id: 1,
      code: "HQ",
      nameAr: "الفرع الرئيسي",
    },
    currency: {
      id: 1,
      code: "SAR",
      nameAr: "ريال سعودي",
    },
    academicYear: {
      id: input.academicYearId ?? "ay-1",
      name: "2054/2055",
    },
    enrollment: {
      id: input.enrollmentId ?? "enr-1",
      student: {
        id: "stu-1",
        fullName: input.studentName,
      },
    },
  };
}

function buildInvoiceInstallmentListItem(input: {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  installmentNumber?: number;
  dueDate?: string;
  amount?: number;
  paidAmount?: number;
  status?: string;
  lateFee?: number;
}) {
  return {
    id: input.id,
    invoiceId: input.invoiceId,
    installmentNumber: input.installmentNumber ?? 1,
    dueDate: input.dueDate ?? "2054-03-15",
    amount: input.amount ?? 600,
    paidAmount: input.paidAmount ?? 0,
    paymentDate: null,
    status: input.status ?? "PENDING",
    lateFee: input.lateFee ?? 0,
    notes: "دفعة اختبارية",
    invoice: {
      id: input.invoiceId,
      invoiceNumber: input.invoiceNumber,
    },
  };
}

function buildFeeStructureListItem(input: {
  id: number;
  nameAr: string;
  academicYearId?: string;
  gradeLevelId?: string;
  feeType?: string;
  amount?: number;
  currencyId?: number;
  vatRate?: number;
  isActive?: boolean;
}) {
  return {
    id: input.id,
    academicYearId: input.academicYearId ?? "ay-1",
    gradeLevelId: input.gradeLevelId ?? "gl-1",
    feeType: input.feeType ?? "TUITION",
    nameAr: input.nameAr,
    amount: input.amount ?? 2500,
    currencyId: input.currencyId ?? 1,
    vatRate: input.vatRate ?? 15,
    isActive: input.isActive ?? true,
    academicYear: {
      id: input.academicYearId ?? "ay-1",
      name: "2054/2055",
    },
    gradeLevel: {
      id: input.gradeLevelId ?? "gl-1",
      name: "الصف الأول",
    },
    currency: {
      id: input.currencyId ?? 1,
      code: "SAR",
      nameAr: "ريال سعودي",
    },
  };
}

function buildDiscountRuleListItem(input: {
  id: number;
  nameAr: string;
  discountType?: string;
  calculationMethod?: string;
  value?: number;
  appliesToFeeType?: string;
  requiresApproval?: boolean;
  academicYearId?: string;
  isActive?: boolean;
}) {
  return {
    id: input.id,
    nameAr: input.nameAr,
    discountType: input.discountType ?? "SIBLING",
    calculationMethod: input.calculationMethod ?? "PERCENTAGE",
    value: input.value ?? 15,
    appliesToFeeType: input.appliesToFeeType ?? "TUITION",
    siblingOrderFrom: 2,
    maxDiscountPercentage: 25,
    requiresApproval: input.requiresApproval ?? true,
    discountGlAccountId: 4101,
    contraGlAccountId: 1101,
    academicYearId: input.academicYearId ?? "ay-1",
    isActive: input.isActive ?? true,
    academicYear: {
      id: input.academicYearId ?? "ay-1",
      name: "2054/2055",
    },
  };
}

function buildBankReconciliationItem(input: { id: string; status: string }) {
  return {
    id: input.id,
    bankAccountId: 10,
    statementDate: "2054-03-20",
    bankBalance: 15000,
    bookBalance: 14800,
    difference: 200,
    status: input.status,
    bankAccount: {
      id: 10,
      accountCode: "1121",
      nameAr: "حساب بنك الراجحي",
      nameEn: "Al Rajhi Bank",
    },
  };
}
