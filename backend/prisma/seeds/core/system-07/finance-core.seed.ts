import { AccountType, FiscalPeriodType, NormalBalance, type PrismaClient } from '@prisma/client';

const DEFAULT_BRANCHES = [
  {
    code: 'MAIN',
    nameAr: 'الفرع الرئيسي',
    nameEn: 'Head Office',
    isHeadquarters: true,
  },
];

const DEFAULT_CURRENCIES = [
  {
    code: 'SAR',
    nameAr: 'ريال سعودي',
    symbol: 'SAR',
    decimalPlaces: 2,
    isBase: true,
  },
  {
    code: 'USD',
    nameAr: 'دولار أمريكي',
    symbol: 'USD',
    decimalPlaces: 2,
    isBase: false,
  },
  {
    code: 'YER',
    nameAr: 'ريال يمني',
    symbol: 'YER',
    decimalPlaces: 2,
    isBase: false,
  },
];

// ═══════════════════════════════════════════════════════════════
// شجرة الحسابات الكاملة — 36 حساب (5 مستويات رئيسية)
// ═══════════════════════════════════════════════════════════════

interface AccountDef {
  accountCode: string;
  nameAr: string;
  nameEn: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  isHeader: boolean;
  isBankAccount?: boolean;
  hierarchyLevel: number;
  parentCode?: string;
}

const CHART_OF_ACCOUNTS: AccountDef[] = [
  { accountCode: '1000', nameAr: 'الأصول', nameEn: 'Assets', accountType: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, isHeader: true, hierarchyLevel: 1 },
  { accountCode: '1100', nameAr: 'الأصول المتداولة', nameEn: 'Current Assets', accountType: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, isHeader: true, hierarchyLevel: 2, parentCode: '1000' },
  { accountCode: '1101', nameAr: 'النقدية والبنوك', nameEn: 'Cash and Banks', accountType: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, isHeader: false, isBankAccount: true, hierarchyLevel: 3, parentCode: '1100' },
  { accountCode: '1102', nameAr: 'بوابات الدفع الإلكتروني', nameEn: 'Electronic Payment Gateways', accountType: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, isHeader: false, isBankAccount: true, hierarchyLevel: 3, parentCode: '1100' },
  { accountCode: '1103', nameAr: 'الذمم المدينة — أولياء الأمور', nameEn: 'Parent Receivables', accountType: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, isHeader: false, hierarchyLevel: 3, parentCode: '1100' },
  { accountCode: '1104', nameAr: 'الذمم المدينة — موظفون', nameEn: 'Employee Receivables', accountType: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, isHeader: false, hierarchyLevel: 3, parentCode: '1100' },
  { accountCode: '1200', nameAr: 'الأصول الثابتة', nameEn: 'Fixed Assets', accountType: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, isHeader: true, hierarchyLevel: 2, parentCode: '1000' },
  { accountCode: '1201', nameAr: 'الأثاث والمعدات', nameEn: 'Furniture and Equipment', accountType: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, isHeader: false, hierarchyLevel: 3, parentCode: '1200' },
  { accountCode: '1202', nameAr: 'وسائل النقل (الباصات)', nameEn: 'Transportation Vehicles', accountType: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, isHeader: false, hierarchyLevel: 3, parentCode: '1200' },
  { accountCode: '1203', nameAr: 'مجمع الإهلاك', nameEn: 'Accumulated Depreciation', accountType: AccountType.ASSET, normalBalance: NormalBalance.CREDIT, isHeader: false, hierarchyLevel: 3, parentCode: '1200' },
  { accountCode: '2000', nameAr: 'الخصوم', nameEn: 'Liabilities', accountType: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT, isHeader: true, hierarchyLevel: 1 },
  { accountCode: '2100', nameAr: 'الخصوم المتداولة', nameEn: 'Current Liabilities', accountType: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT, isHeader: true, hierarchyLevel: 2, parentCode: '2000' },
  { accountCode: '2101', nameAr: 'الذمم الدائنة — الموردون', nameEn: 'Accounts Payable', accountType: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT, isHeader: false, hierarchyLevel: 3, parentCode: '2100' },
  { accountCode: '2102', nameAr: 'الرواتب المستحقة', nameEn: 'Accrued Salaries', accountType: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT, isHeader: false, hierarchyLevel: 3, parentCode: '2100' },
  { accountCode: '2103', nameAr: 'مستحقات الاسترداد — أولياء أمور', nameEn: 'Parent Refunds Payable', accountType: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT, isHeader: false, hierarchyLevel: 3, parentCode: '2100' },
  { accountCode: '2104', nameAr: 'ضريبة القيمة المضافة المستحقة', nameEn: 'VAT Payable', accountType: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT, isHeader: false, hierarchyLevel: 3, parentCode: '2100' },
  { accountCode: '2105', nameAr: 'إيرادات مؤجلة (رسوم مقدمة)', nameEn: 'Deferred Revenue', accountType: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT, isHeader: false, hierarchyLevel: 3, parentCode: '2100' },
  { accountCode: '3000', nameAr: 'حقوق الملكية', nameEn: 'Equity', accountType: AccountType.EQUITY, normalBalance: NormalBalance.CREDIT, isHeader: true, hierarchyLevel: 1 },
  { accountCode: '3001', nameAr: 'رأس المال', nameEn: 'Capital', accountType: AccountType.EQUITY, normalBalance: NormalBalance.CREDIT, isHeader: false, hierarchyLevel: 2, parentCode: '3000' },
  { accountCode: '3002', nameAr: 'الأرباح المحتجزة', nameEn: 'Retained Earnings', accountType: AccountType.EQUITY, normalBalance: NormalBalance.CREDIT, isHeader: false, hierarchyLevel: 2, parentCode: '3000' },
  { accountCode: '4000', nameAr: 'الإيرادات', nameEn: 'Revenue', accountType: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT, isHeader: true, hierarchyLevel: 1 },
  { accountCode: '4001', nameAr: 'إيراد الرسوم الدراسية', nameEn: 'Tuition Revenue', accountType: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT, isHeader: false, hierarchyLevel: 2, parentCode: '4000' },
  { accountCode: '4002', nameAr: 'إيراد المساهمة المجتمعية', nameEn: 'Community Contribution Revenue', accountType: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT, isHeader: false, hierarchyLevel: 2, parentCode: '4000' },
  { accountCode: '4003', nameAr: 'إيراد رسوم النقل', nameEn: 'Transport Revenue', accountType: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT, isHeader: false, hierarchyLevel: 2, parentCode: '4000' },
  { accountCode: '4004', nameAr: 'إيراد رسوم الزي المدرسي', nameEn: 'Uniform Revenue', accountType: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT, isHeader: false, hierarchyLevel: 2, parentCode: '4000' },
  { accountCode: '4005', nameAr: 'إيراد رسوم التسجيل', nameEn: 'Registration Revenue', accountType: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT, isHeader: false, hierarchyLevel: 2, parentCode: '4000' },
  { accountCode: '4006', nameAr: 'إيرادات أخرى / تبرعات', nameEn: 'Other Revenue and Donations', accountType: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT, isHeader: false, hierarchyLevel: 2, parentCode: '4000' },
  { accountCode: '4007', nameAr: 'إيراد الغرامات والتأخير', nameEn: 'Penalties Revenue', accountType: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT, isHeader: false, hierarchyLevel: 2, parentCode: '4000' },
  { accountCode: '5000', nameAr: 'المصروفات', nameEn: 'Expenses', accountType: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT, isHeader: true, hierarchyLevel: 1 },
  { accountCode: '5001', nameAr: 'مصروف الرواتب والأجور', nameEn: 'Salaries and Wages Expense', accountType: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT, isHeader: false, hierarchyLevel: 2, parentCode: '5000' },
  { accountCode: '5002', nameAr: 'مصروف الصيانة', nameEn: 'Maintenance Expense', accountType: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT, isHeader: false, hierarchyLevel: 2, parentCode: '5000' },
  { accountCode: '5003', nameAr: 'مصروف الوقود والنقل', nameEn: 'Fuel and Transport Expense', accountType: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT, isHeader: false, hierarchyLevel: 2, parentCode: '5000' },
  { accountCode: '5004', nameAr: 'مصروف المشتريات والمخازن', nameEn: 'Procurement and Inventory Expense', accountType: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT, isHeader: false, hierarchyLevel: 2, parentCode: '5000' },
  { accountCode: '5005', nameAr: 'مصروف الإهلاك', nameEn: 'Depreciation Expense', accountType: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT, isHeader: false, hierarchyLevel: 2, parentCode: '5000' },
  { accountCode: '5006', nameAr: 'مصروفات إدارية عامة', nameEn: 'General Administrative Expense', accountType: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT, isHeader: false, hierarchyLevel: 2, parentCode: '5000' },
  { accountCode: '5007', nameAr: 'مصروف خصومات (إخوة/إعفاءات)', nameEn: 'Discount Expense', accountType: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT, isHeader: false, hierarchyLevel: 2, parentCode: '5000' },
];

// ═══════════════════════════════════════════════════════════════
// السنة المالية والفترات
// ═══════════════════════════════════════════════════════════════

const FISCAL_YEAR_MONTHS = [
  { periodNumber: 1, nameAr: 'يناير 2026', start: '2026-01-01', end: '2026-01-31' },
  { periodNumber: 2, nameAr: 'فبراير 2026', start: '2026-02-01', end: '2026-02-28' },
  { periodNumber: 3, nameAr: 'مارس 2026', start: '2026-03-01', end: '2026-03-31' },
  { periodNumber: 4, nameAr: 'أبريل 2026', start: '2026-04-01', end: '2026-04-30' },
  { periodNumber: 5, nameAr: 'مايو 2026', start: '2026-05-01', end: '2026-05-31' },
  { periodNumber: 6, nameAr: 'يونيو 2026', start: '2026-06-01', end: '2026-06-30' },
  { periodNumber: 7, nameAr: 'يوليو 2026', start: '2026-07-01', end: '2026-07-31' },
  { periodNumber: 8, nameAr: 'أغسطس 2026', start: '2026-08-01', end: '2026-08-31' },
  { periodNumber: 9, nameAr: 'سبتمبر 2026', start: '2026-09-01', end: '2026-09-30' },
  { periodNumber: 10, nameAr: 'أكتوبر 2026', start: '2026-10-01', end: '2026-10-31' },
  { periodNumber: 11, nameAr: 'نوفمبر 2026', start: '2026-11-01', end: '2026-11-30' },
  { periodNumber: 12, nameAr: 'ديسمبر 2026', start: '2026-12-01', end: '2026-12-31' },
];

// ═══════════════════════════════════════════════════════════════
// الدالة الرئيسية
// ═══════════════════════════════════════════════════════════════

export async function seedSystem07FinanceCore(prisma: PrismaClient) {
  // ─── 1. الفروع ───
  for (const branch of DEFAULT_BRANCHES) {
    await prisma.branch.upsert({
      where: { code: branch.code },
      update: {
        nameAr: branch.nameAr,
        nameEn: branch.nameEn,
        isHeadquarters: branch.isHeadquarters,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: branch.code,
        nameAr: branch.nameAr,
        nameEn: branch.nameEn,
        isHeadquarters: branch.isHeadquarters,
        isActive: true,
      },
    });
  }

  // ─── 2. العملات ───
  for (const currency of DEFAULT_CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {
        nameAr: currency.nameAr,
        symbol: currency.symbol,
        decimalPlaces: currency.decimalPlaces,
        isBase: currency.isBase,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: currency.code,
        nameAr: currency.nameAr,
        symbol: currency.symbol,
        decimalPlaces: currency.decimalPlaces,
        isBase: currency.isBase,
        isActive: true,
      },
    });
  }

  // ضمان عملة أساسية واحدة فقط
  const baseCurrency = await prisma.currency.findFirst({
    where: { isBase: true, deletedAt: null },
    orderBy: { id: 'asc' },
  });

  if (baseCurrency) {
    await prisma.currency.updateMany({
      where: { id: { not: baseCurrency.id } },
      data: { isBase: false },
    });
  }

  // ─── 3. شجرة الحسابات الكاملة (36 حساب) ───
  const accountsByCode = new Map<string, { id: number }>();

  // المرحلة 1: إنشاء حسابات المستوى الأول (بدون parent)
  for (const account of CHART_OF_ACCOUNTS.filter((a) => !a.parentCode)) {
    const record = await prisma.chartOfAccount.upsert({
      where: { accountCode: account.accountCode },
      update: {
        nameAr: account.nameAr,
        nameEn: account.nameEn,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        isHeader: account.isHeader,
        isBankAccount: account.isBankAccount ?? false,
        defaultCurrencyId: baseCurrency?.id ?? null,
        isSystem: true,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        accountCode: account.accountCode,
        nameAr: account.nameAr,
        nameEn: account.nameEn,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        isHeader: account.isHeader,
        isBankAccount: account.isBankAccount ?? false,
        hierarchyLevel: account.hierarchyLevel,
        defaultCurrencyId: baseCurrency?.id ?? null,
        isSystem: true,
        isActive: true,
      },
    });
    accountsByCode.set(account.accountCode, { id: record.id });
  }

  // المرحلة 2: إنشاء حسابات المستوى الثاني (لها parent level 1)
  for (const account of CHART_OF_ACCOUNTS.filter((a) => a.parentCode && a.hierarchyLevel === 2)) {
    const parent = accountsByCode.get(account.parentCode!);
    const record = await prisma.chartOfAccount.upsert({
      where: { accountCode: account.accountCode },
      update: {
        nameAr: account.nameAr,
        nameEn: account.nameEn,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        isHeader: account.isHeader,
        isBankAccount: account.isBankAccount ?? false,
        parentId: parent?.id ?? null,
        hierarchyLevel: account.hierarchyLevel,
        defaultCurrencyId: baseCurrency?.id ?? null,
        isSystem: true,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        accountCode: account.accountCode,
        nameAr: account.nameAr,
        nameEn: account.nameEn,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        isHeader: account.isHeader,
        isBankAccount: account.isBankAccount ?? false,
        parentId: parent?.id ?? null,
        hierarchyLevel: account.hierarchyLevel,
        defaultCurrencyId: baseCurrency?.id ?? null,
        isSystem: true,
        isActive: true,
      },
    });
    accountsByCode.set(account.accountCode, { id: record.id });
  }

  // المرحلة 3: إنشاء حسابات المستوى الثالث
  for (const account of CHART_OF_ACCOUNTS.filter((a) => a.parentCode && a.hierarchyLevel === 3)) {
    const parent = accountsByCode.get(account.parentCode!);
    const record = await prisma.chartOfAccount.upsert({
      where: { accountCode: account.accountCode },
      update: {
        nameAr: account.nameAr,
        nameEn: account.nameEn,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        isHeader: account.isHeader,
        isBankAccount: account.isBankAccount ?? false,
        parentId: parent?.id ?? null,
        hierarchyLevel: account.hierarchyLevel,
        defaultCurrencyId: baseCurrency?.id ?? null,
        isSystem: true,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        accountCode: account.accountCode,
        nameAr: account.nameAr,
        nameEn: account.nameEn,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        isHeader: account.isHeader,
        isBankAccount: account.isBankAccount ?? false,
        parentId: parent?.id ?? null,
        hierarchyLevel: account.hierarchyLevel,
        defaultCurrencyId: baseCurrency?.id ?? null,
        isSystem: true,
        isActive: true,
      },
    });
    accountsByCode.set(account.accountCode, { id: record.id });
  }

  // ─── 4. السنة المالية + 12 فترة شهرية ───
  const fiscalYear = await prisma.fiscalYear.upsert({
    where: {
      startDate_endDate: {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    },
    update: {
      nameAr: 'السنة المالية 2026',
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      nameAr: 'السنة المالية 2026',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      isClosed: false,
      isActive: true,
    },
  });

  for (const month of FISCAL_YEAR_MONTHS) {
    await prisma.fiscalPeriod.upsert({
      where: {
        fiscalYearId_periodNumber: {
          fiscalYearId: fiscalYear.id,
          periodNumber: month.periodNumber,
        },
      },
      update: {
        nameAr: month.nameAr,
        startDate: new Date(month.start),
        endDate: new Date(month.end),
        periodType: FiscalPeriodType.MONTHLY,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        fiscalYearId: fiscalYear.id,
        periodNumber: month.periodNumber,
        nameAr: month.nameAr,
        startDate: new Date(month.start),
        endDate: new Date(month.end),
        periodType: FiscalPeriodType.MONTHLY,
        status: 'OPEN',
        isActive: true,
      },
    });
  }
}
