import { expect, test, type Page, type Route } from "@playwright/test";
import { injectAuthSession } from "./helpers/auth-session";
import { e2ePermissionSets } from "./helpers/permissions";
import { openModulePage } from "./helpers/ui-assertions";

type JsonObject = Record<string, unknown>;

test.describe("finance smoke", () => {
  test("shows the finance dashboard quick links for a finance-enabled user", async ({
    page,
  }) => {
    await signInAsFinanceUser(page);

    await page.goto("/app/finance");

    await expect(
      page.getByRole("main").getByRole("heading", { name: "النظام المالي" }),
    ).toBeVisible();
    await expect(page.getByText("الوصول السريع لخدمات المالية")).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "الفروع" }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "عمليات الدفع" }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "التقارير المالية" }),
    ).toBeVisible();
  });

  test("renders the branches page with mocked finance data", async ({ page }) => {
    await signInAsFinanceUser(page);
    await mockJson(page, "**/backend/finance/branches**", {
      data: [
        {
          id: 1,
          code: "HQ",
          nameAr: "الفرع الرئيسي",
          nameEn: "Main Branch",
          address: "Sanaa",
          phone: "777000111",
          isHeadquarters: true,
          isActive: true,
          createdAt: "2026-03-28T00:00:00.000Z",
          updatedAt: "2026-03-28T00:00:00.000Z",
        },
      ],
      pagination: {
        page: 1,
        limit: 12,
        total: 1,
        totalPages: 1,
      },
    });

    await openModulePage({
      page,
      path: "/app/branches",
      heading: "الفروع",
    });

    await expect(page.getByText("قائمة الفروع")).toBeVisible();
    await expect(page.getByText("الفرع الرئيسي", { exact: true })).toBeVisible();
    await expect(page.getByText("مقر رئيسي")).toBeVisible();
    await expect(page.getByText("نشط")).toBeVisible();
    await expect(page.getByText("الإجمالي: 1")).toBeVisible();
  });

  test("renders the currencies page with a base currency", async ({ page }) => {
    await signInAsFinanceUser(page);
    await mockJson(page, "**/backend/finance/currencies**", {
      data: [
        {
          id: 1,
          code: "SAR",
          nameAr: "ريال سعودي",
          symbol: "ر.س",
          decimalPlaces: 2,
          isBase: true,
          isActive: true,
        },
      ],
      pagination: {
        page: 1,
        limit: 12,
        total: 1,
        totalPages: 1,
      },
    });

    await openModulePage({
      page,
      path: "/app/currencies",
      heading: "العملات",
    });

    await expect(page.getByText("قائمة العملات")).toBeVisible();
    await expect(page.getByText("ريال سعودي (SAR)")).toBeVisible();
    await expect(page.getByText("عملة الأساس")).toBeVisible();
    await expect(page.getByText("نشط")).toBeVisible();
    await expect(page.getByText("الإجمالي: 1")).toBeVisible();
  });

  test("renders the chart of accounts page with parent account metadata", async ({
    page,
  }) => {
    await signInAsFinanceUser(page);
    await mockJson(page, "**/backend/finance/chart-of-accounts**", {
      data: [
        {
          id: 1100,
          accountCode: "1100",
          nameAr: "الأصول المتداولة",
          nameEn: "Current Assets",
          accountType: "ASSET",
          parentId: null,
          isHeader: true,
          isBankAccount: false,
          isActive: true,
        },
        {
          id: 1101,
          accountCode: "1101",
          nameAr: "الصندوق",
          nameEn: "Cash",
          accountType: "ASSET",
          parentId: 1100,
          isHeader: false,
          isBankAccount: false,
          isActive: true,
        },
      ],
      pagination: {
        page: 1,
        limit: 12,
        total: 2,
        totalPages: 1,
      },
    });

    await openModulePage({
      page,
      path: "/app/chart-of-accounts",
      heading: "دليل الحسابات",
    });

    await expect(page.getByText("تنظيم الحسابات المالية وتصنيفها وربطها بالحسابات الأب.")).toBeVisible();
    await expect(page.getByText("الصندوق (1101)")).toBeVisible();
    await expect(page.getByText("النوع: أصول · الأب: 1100")).toBeVisible();
    await expect(page.getByText("تفصيلي")).toBeVisible();
    await expect(page.getByText("الإجمالي: 2")).toBeVisible();
  });

  test("renders the journal entries page with a posted entry", async ({ page }) => {
    await signInAsFinanceUser(page);
    await mockJson(page, "**/backend/finance/journal-entries**", {
      data: [
        {
          id: "je-1",
          entryNumber: "JE-2054-00001",
          entryNo: "JE-2054-00001",
          entryDate: "2054-02-11",
          postingDate: "2054-02-11",
          description: "قيد اختبار مالي",
          totalDebit: 250,
          totalCredit: 250,
          status: "POSTED",
          referenceType: "PAYMENT_TRANSACTION",
          createdBy: {
            email: "admin@school.local",
          },
          lines: [],
          fiscalPeriod: {
            id: "fp-1",
            code: "FP-01",
            name: "الفترة الأولى",
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 12,
        total: 1,
        totalPages: 1,
      },
    });

    await openModulePage({
      page,
      path: "/app/journal-entries",
      heading: "القيود اليومية",
    });

    await expect(page.getByText("JE-2054-00001")).toBeVisible();
    await expect(page.getByText("قيد اختبار مالي")).toBeVisible();
    await expect(page.getByText("مرحّل")).toBeVisible();
    await expect(page.getByText("الإجمالي: 1")).toBeVisible();
    await expect(page.getByText("المصدر: PAYMENT_TRANSACTION")).toBeVisible();
  });

  test("renders the payment transactions page with a completed transaction", async ({
    page,
  }) => {
    await signInAsFinanceUser(page);
    await mockJson(page, "**/backend/finance/payment-transactions**", {
      data: [
        {
          id: "ptx-1",
          transactionNumber: "TXN-2054-00001",
          gatewayId: 1,
          gatewayTransactionId: "gw-1",
          invoiceId: "inv-1",
          installmentId: "inst-1",
          enrollmentId: "enr-1",
          amount: 575,
          currencyId: 1,
          paymentMethod: "CARD",
          status: "COMPLETED",
          paidAt: "2054-02-12T10:00:00.000Z",
          receiptNumber: "RCP-2054-00001",
          payerName: "ولي أمر الطالب",
          payerPhone: "777000222",
          journalEntryId: "je-1",
          notes: "Payment completed",
          createdAt: "2054-02-12T10:00:00.000Z",
          updatedAt: "2054-02-12T10:05:00.000Z",
          gateway: {
            id: 1,
            nameAr: "بوابة اختبار",
            nameEn: "Test Gateway",
            providerCode: "TESTGW",
            gatewayType: "ONLINE",
            apiEndpoint: null,
            merchantId: null,
            settlementAccountId: 10,
            isActive: true,
          },
          enrollment: {
            id: "enr-1",
            studentId: "stu-1",
            academicYearId: "ay-1",
            sectionId: "sec-1",
          },
          invoice: {
            id: "inv-1",
            invoiceNumber: "INV-2054-00001",
            status: "PARTIAL",
          },
          installment: {
            id: "inst-1",
            installmentNumber: "1",
            dueDate: "2054-03-01",
            status: "PAID",
          },
          journalEntry: {
            id: "je-1",
            entryNumber: "JE-2054-00001",
            status: "POSTED",
          },
          createdBy: {
            id: "user-1",
            email: "admin@school.local",
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 12,
        total: 1,
        totalPages: 1,
      },
    });

    await openModulePage({
      page,
      path: "/app/payment-transactions",
      heading: "عمليات الدفع",
    });

    await expect(page.getByText("TXN-2054-00001")).toBeVisible();
    await expect(page.getByText("ولي أمر الطالب")).toBeVisible();
    await expect(page.getByText("مكتملة")).toBeVisible();
    await expect(page.getByText("INV-2054-00001")).toBeVisible();
    await expect(page.getByText("575 ر.س")).toBeVisible();
  });

  test("renders the student invoices page with invoice balances", async ({ page }) => {
    await signInAsFinanceUser(page);
    await mockJson(page, "**/backend/finance/student-invoices**", {
      data: [
        {
          id: "inv-1",
          invoiceNumber: "INV-2054-1001",
          enrollmentId: "enr-1",
          academicYearId: "ay-1",
          branchId: 1,
          currencyId: 1,
          invoiceDate: "2054-02-10",
          dueDate: "2054-03-01",
          status: "PARTIAL",
          notes: "رسوم الفصل الأول",
          totalAmount: 1200,
          balanceDue: 450,
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
            id: "ay-1",
            name: "2054/2055",
          },
          enrollment: {
            id: "enr-1",
            student: {
              id: "stu-1",
              fullName: "أحمد علي",
            },
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });

    await openModulePage({
      page,
      path: "/app/student-invoices",
      heading: "فواتير الطلاب",
      headingLevel: 1,
    });

    await expect(page.getByText("ملخص الفواتير")).toBeVisible();
    await expect(page.getByText("INV-2054-1001")).toBeVisible();
    await expect(page.getByText("أحمد علي")).toBeVisible();
    await expect(page.getByText("الفرع الرئيسي")).toBeVisible();
    await expect(page.getByText("الرصيد المتبقي: ٤٥٠")).toBeVisible();
    await expect(page.getByText(/النتائج:\s*1/)).toBeVisible();
  });

  test("renders the invoice installments page with progress details", async ({
    page,
  }) => {
    await signInAsFinanceUser(page);
    await mockJson(page, "**/backend/finance/invoice-installments**", {
      data: [
        {
          id: "inst-1",
          invoiceId: "inv-1",
          installmentNumber: 2,
          dueDate: "2054-03-15",
          amount: 600,
          paidAmount: 200,
          paymentDate: "2054-03-01",
          status: "PARTIAL",
          lateFee: 0,
          notes: "الدفعة الثانية",
          invoice: {
            id: "inv-1",
            invoiceNumber: "INV-2054-1001",
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 12,
        total: 1,
        totalPages: 1,
      },
    });

    await openModulePage({
      page,
      path: "/app/invoice-installments",
      heading: "تقسيط الفواتير",
      headingLevel: 1,
    });

    await expect(page.getByText("ملخص التقسيط")).toBeVisible();
    await expect(page.getByText("قسط رقم 2")).toBeVisible();
    await expect(page.getByText("INV-2054-1001")).toBeVisible();
    await expect(page.getByText(/جزئي:\s*1/)).toBeVisible();
    await expect(page.getByText("المسدد:")).toBeVisible();
    await expect(page.getByText(/الإجمالي:\s*1/)).toBeVisible();
  });

  test("runs billing engine actions and records success logs", async ({ page }) => {
    await signInAsFinanceUser(page);
    await mockJson(page, "**/backend/finance/billing/defaults", {
      academicYear: {
        id: "ay-2054",
        code: "AY-2054",
        name: "2054/2055",
        status: "ACTIVE",
        isCurrent: true,
      },
      baseCurrency: {
        id: 1,
        code: "SAR",
        nameAr: "ريال سعودي",
      },
      invoiceDate: "2054-02-01",
      dueDate: "2054-03-03",
      installmentCount: 1,
      applySiblingDiscount: false,
    });
    await mockJson(page, "**/backend/finance/billing/bulk-generate", {
      message: "نجحت العملية",
      generated: 12,
      skipped: 1,
    });
    await mockJson(page, "**/backend/finance/billing/family-balance/guardian-1", {
      summary: {
        balance: 450,
        childrenCount: 2,
      },
      items: [],
    });

    await openModulePage({
      page,
      path: "/app/billing-engine",
      heading: "محرك الفوترة",
      headingLevel: 1,
    });

    await expect(page.getByText("سجل العمليات الأخيرة")).toBeVisible();
    await expect(page.getByText("لا توجد عمليات منفذة بعد.")).toBeVisible();
    await expect(page.getByText("السنة الحالية: 2054/2055")).toBeVisible();

    await page.getByPlaceholder("معرّف السنة الدراسية").first().fill("ay-2054");
    await page.getByRole("button", { name: "تشغيل التوليد" }).click();

    await expect(page.getByText("توليد الفواتير")).toBeVisible();
    await expect(page.getByText(/نجحت العملية/)).toBeVisible();
    await expect(page.getByText(/تم توليد .* فاتورة/)).toBeVisible();

    await page
      .getByPlaceholder("معرّف ولي الأمر (Guardian ID)")
      .nth(1)
      .fill("guardian-1");
    await page.getByRole("button", { name: "رصيد العائلة" }).click();

    await expect(page.getByText(/إجمالي الرصيد:/)).toBeVisible();
    await expect(page.getByText(/لعدد .* أبناء/)).toBeVisible();
  });

  test("renders the bank reconciliations page with reconciliation status", async ({
    page,
  }) => {
    await signInAsFinanceUser(page);
    await mockJson(page, "**/backend/finance/bank-reconciliations**", {
      data: [
        {
          id: "br-1",
          bankAccountId: 10,
          statementDate: "2054-03-20",
          bankBalance: 15000,
          bookBalance: 14800,
          difference: 200,
          status: "OPEN",
          bankAccount: {
            id: 10,
            accountCode: "1121",
            nameAr: "حساب بنك الراجحي",
            nameEn: "Al Rajhi Bank",
          },
        },
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

    await expect(page.getByText("النظام 07 - المحاسبة والخزينة")).toBeVisible();
    await expect(page.getByText("حساب بنك الراجحي")).toBeVisible();
    await expect(page.getByText("1121")).toBeVisible();
    await expect(page.getByText("مفتوحة")).toBeVisible();
    await expect(page.getByText(/الفرق:/)).toBeVisible();
    await expect(page.getByText(/الإجمالي:\s*1/)).toBeVisible();
  });

  test("renders the fee structures page with structure summary", async ({ page }) => {
    await signInAsFinanceUser(page);
    await mockJson(page, "**/backend/finance/fee-structures**", {
      data: [
        {
          id: 1,
          academicYearId: "ay-1",
          gradeLevelId: "gl-1",
          feeType: "TUITION",
          nameAr: "رسوم الصف الأول",
          amount: 2500,
          currencyId: 1,
          vatRate: 15,
          isActive: true,
          academicYear: {
            id: "ay-1",
            name: "2054/2055",
          },
          gradeLevel: {
            id: "gl-1",
            name: "الصف الأول",
          },
          currency: {
            id: 1,
            code: "SAR",
            nameAr: "ريال سعودي",
          },
        },
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
      path: "/app/fee-structures",
      heading: "هياكل الرسوم",
      headingLevel: 1,
    });

    await expect(page.getByText("ملخص الهياكل")).toBeVisible();
    await expect(page.getByText("رسوم الصف الأول")).toBeVisible();
    await expect(page.getByText("المرحلة: الصف الأول")).toBeVisible();
    await expect(page.getByText("نوع الرسوم: رسوم دراسية")).toBeVisible();
    await expect(page.getByText("٢٬٥٠٠ SAR")).toBeVisible();
  });

  test("renders the discount rules page with approval policy", async ({ page }) => {
    await signInAsFinanceUser(page);
    await mockJson(page, "**/backend/finance/discount-rules**", {
      data: [
        {
          id: 1,
          nameAr: "خصم الأشقاء",
          discountType: "SIBLING",
          calculationMethod: "PERCENTAGE",
          value: 15,
          appliesToFeeType: "TUITION",
          siblingOrderFrom: 2,
          maxDiscountPercentage: 25,
          requiresApproval: true,
          discountGlAccountId: 4101,
          contraGlAccountId: 1101,
          academicYearId: "ay-1",
          isActive: true,
          academicYear: {
            id: "ay-1",
            name: "2054/2055",
          },
        },
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

    await expect(page.getByText("ملخص الخصومات")).toBeVisible();
    await expect(page.getByText("خصم الأشقاء")).toBeVisible();
    await expect(page.getByText("التصنيف: أشقاء")).toBeVisible();
    await expect(page.getByText("القيمة (نسبة): 15%")).toBeVisible();
    await expect(page.getByText("يتطلب اعتماد")).toBeVisible();
  });

  test("runs the hr integrations payroll journal flow", async ({ page }) => {
    await signInAsFinanceUser(page);
    await mockJson(page, "**/backend/finance/hr/payroll-journal", {
      journalEntryId: "je-hr-1",
      entryNumber: "JE-HR-2054-0001",
      totalSalaries: 15000,
      totalDeductions: 1200,
      netSalaries: 13800,
    });

    await openModulePage({
      page,
      path: "/app/hr-integrations",
      heading: "تكاملات الموارد البشرية",
      headingLevel: 1,
    });

    await expect(page.getByText("سجل التكاملات الأخيرة")).toBeVisible();
    await expect(page.getByText("لا توجد عمليات منفذة بعد.")).toBeVisible();

    await page.getByPlaceholder("الشهر (1-12)").fill("3");
    await page.getByPlaceholder("السنة (YYYY)").fill("2054");
    await page.getByPlaceholder("إجمالي الرواتب").fill("15000");
    await page.getByPlaceholder("إجمالي الخصومات (اختياري)").fill("1200");
    await page.getByRole("button", { name: "إنشاء قيد الرواتب" }).click();

    await expect(page.getByText(/JE-HR-2054-0001/)).toBeVisible();
    await expect(page.getByText(/صافي .* ر\.س/)).toBeVisible();
  });

  test("runs the procurement integrations purchase journal flow", async ({ page }) => {
    await signInAsFinanceUser(page);
    await mockJson(page, "**/backend/finance/procurement/purchase-journal", {
      journalEntryId: "je-proc-1",
      entryNumber: "JE-PR-2054-0001",
      totalAmount: 8800,
      vatAmount: 1200,
    });

    await openModulePage({
      page,
      path: "/app/procurement-integrations",
      heading: "تكاملات المشتريات",
      headingLevel: 1,
    });

    await expect(page.getByText("سجل التكاملات الأخيرة")).toBeVisible();
    await expect(page.getByText("لا توجد عمليات منفذة بعد.")).toBeVisible();

    await page.getByPlaceholder("إجمالي المبلغ").fill("8800");
    await page.getByPlaceholder("ضريبة القيمة (اختياري)").fill("1200");
    await page.getByRole("button", { name: "إنشاء قيد المشتريات" }).click();

    await expect(page.getByText(/JE-PR-2054-0001/)).toBeVisible();
    await expect(page.getByText(/ضريبة .* ر\.س/)).toBeVisible();
  });

  test("runs the transport integrations generate invoices flow", async ({ page }) => {
    await signInAsFinanceUser(page);
    await mockJson(page, "**/backend/finance/transport/revenue-report**", {
      filters: {
        branchId: null,
        dateFrom: null,
        dateTo: null,
      },
      summary: {
        invoiceCount: 2,
        transactionCount: 1,
        totalRevenue: 1950,
        collectedRevenue: 1150,
        outstandingRevenue: 800,
      },
    });
    await mockJson(page, "**/backend/finance/transport/generate-invoices", {
      generated: 2,
      errors: [],
      invoices: [
        {
          enrollmentId: "enr-1",
          invoiceNumber: "INV-TR-2054-0001",
          totalAmount: 575,
        },
        {
          enrollmentId: "enr-2",
          invoiceNumber: "INV-TR-2054-0002",
          totalAmount: 575,
        },
      ],
    });

    await openModulePage({
      page,
      path: "/app/transport-integrations",
      heading: "تكاملات النقل",
      headingLevel: 1,
    });

    await expect(page.getByText("ملخص إيرادات النقل")).toBeVisible();
    await expect(page.getByText("عدد الفواتير")).toBeVisible();
    await expect(page.getByText("الإيرادات المحصلة", { exact: true })).toBeVisible();
    await expect(page.getByText("سجل التكاملات الأخيرة")).toBeVisible();
    await expect(page.getByText("لا توجد عمليات منفذة بعد.")).toBeVisible();

    await page.getByPlaceholder("معرف العام الدراسي").fill("ay-2054");
    await page
      .getByPlaceholder("معرفات القيد (افصل بفاصلة أو سطر جديد)")
      .fill("enr-1,enr-2");
    await page.getByPlaceholder("مبلغ الرسوم").first().fill("500");
    await page.getByRole("button", { name: "توليد الفواتير" }).click();

    await expect(page.getByText(/تم توليد 2 فاتورة/)).toBeVisible();
  });

  test("renders the financial reports page with a trial balance payload", async ({
    page,
  }) => {
    await signInAsFinanceUser(page);
    await mockJson(page, "**/backend/finance/reports/trial-balance**", {
      generatedAt: "2054-02-12T12:00:00.000Z",
      summary: {
        totalDebit: 1000,
        totalCredit: 1000,
      },
      rows: [
        {
          accountCode: "1101",
          accountName: "الصندوق",
          debit: 1000,
          credit: 0,
        },
      ],
    });

    await openModulePage({
      page,
      path: "/app/financial-reports",
      heading: "التقارير المالية",
    });

    await expect(page.getByText("نوع التقرير: ميزان المراجعة")).toBeVisible();
    await expect(page.getByText("عدد الصفوف: 1")).toBeVisible();
    await expect(page.getByText("totalDebit: 1000")).toBeVisible();
    await expect(page.getByText("\"accountCode\": \"1101\"")).toBeVisible();
  });

  test("shows the permission guard when a finance permission is missing", async ({
    page,
  }) => {
    const permissionCodes = e2ePermissionSets.financeSmokeRead.filter(
      (code) => code !== "branches.read",
    );
    await injectAuthSession(page, permissionCodes);

    await page.goto("/app/branches");

    await expect(page.getByText("403 - غير مصرح")).toBeVisible();
    await expect(
      page.getByText("لا تملك الصلاحية المطلوبة للوصول إلى هذه الصفحة."),
    ).toBeVisible();
    await expect(page.getByText("branches.read")).toBeVisible();
  });
});

async function signInAsFinanceUser(page: Page) {
  await injectAuthSession(page, e2ePermissionSets.financeSmokeRead);
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
