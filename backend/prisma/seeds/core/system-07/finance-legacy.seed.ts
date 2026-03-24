import { FinancialCategoryType, FinancialFundType, type PrismaClient } from '@prisma/client';

const EXEMPTION_REASONS = [
  { nameAr: 'يتيم', code: 'ORPHAN', sortOrder: 1 },
  { nameAr: 'ابن تربوي', code: 'TEACHER_CHILD', sortOrder: 2 },
  { nameAr: 'ابن موظف', code: 'EMPLOYEE_CHILD', sortOrder: 3 },
  { nameAr: 'أحفاد بلال', code: 'BILAL_DESCENDANTS', sortOrder: 4 },
  { nameAr: 'له أكثر من أخ', code: 'MULTIPLE_SIBLINGS', sortOrder: 5 },
  { nameAr: 'حالة متعسرة', code: 'FINANCIAL_HARDSHIP', sortOrder: 6 },
  { nameAr: 'أخرى', code: 'OTHER', sortOrder: 99 },
];

const EXEMPTION_AUTHORITIES = [
  { nameAr: 'تعميم وزاري', code: 'CIRCULAR' },
  { nameAr: 'قرار مدير', code: 'PRINCIPAL' },
  { nameAr: 'مجلس الآباء', code: 'PARENTS_COUNCIL' },
  { nameAr: 'أخرى', code: 'OTHER' },
];

const CONTRIBUTION_AMOUNTS = [
  { nameAr: 'أساسي (محسن)', amountValue: 5000 },
  { nameAr: 'أساسي (مخفض)', amountValue: 2500 },
  { nameAr: 'ثانوي (كامل)', amountValue: 7000 },
];

const FINANCIAL_CATEGORIES = [
  { nameAr: 'المساهمة المجتمعية', categoryType: FinancialCategoryType.REVENUE, code: 'REV_COMMUNITY', accountCode: '4002' },
  { nameAr: 'رسوم التسجيل والقبول', categoryType: FinancialCategoryType.REVENUE, code: 'REV_REGISTRATION', accountCode: '4005' },
  { nameAr: 'الرسوم الدراسية (الأقساط)', categoryType: FinancialCategoryType.REVENUE, code: 'REV_TUITION', accountCode: '4001' },
  { nameAr: 'رسوم النقل المدرسي', categoryType: FinancialCategoryType.REVENUE, code: 'REV_TRANSPORT', accountCode: '4003' },
  { nameAr: 'رسوم الزي المدرسي', categoryType: FinancialCategoryType.REVENUE, code: 'REV_UNIFORM', accountCode: '4004' },
  { nameAr: 'رسوم الكتب والقرطاسية', categoryType: FinancialCategoryType.REVENUE, code: 'REV_BOOKS', accountCode: '4006' },
  { nameAr: 'رسوم الأنشطة والفعاليات', categoryType: FinancialCategoryType.REVENUE, code: 'REV_ACTIVITIES', accountCode: '4006' },
  { nameAr: 'إيرادات المقصف/الكافتيريا', categoryType: FinancialCategoryType.REVENUE, code: 'REV_CAFETERIA', accountCode: '4006' },
  { nameAr: 'رسوم الامتحانات', categoryType: FinancialCategoryType.REVENUE, code: 'REV_EXAMS', accountCode: '4006' },
  { nameAr: 'غرامات التأخير', categoryType: FinancialCategoryType.REVENUE, code: 'REV_LATE_FEE', accountCode: '4007' },
  { nameAr: 'تبرعات ومنح', categoryType: FinancialCategoryType.REVENUE, code: 'REV_DONATION', accountCode: '4006' },
  { nameAr: 'إيرادات تأجير المرافق', categoryType: FinancialCategoryType.REVENUE, code: 'REV_FACILITY_RENTAL', accountCode: '4006' },
  { nameAr: 'رسوم الشهادات والوثائق', categoryType: FinancialCategoryType.REVENUE, code: 'REV_CERTIFICATES', accountCode: '4006' },
  { nameAr: 'رسوم الدورات التدريبية', categoryType: FinancialCategoryType.REVENUE, code: 'REV_TRAINING', accountCode: '4006' },
  { nameAr: 'إيرادات متنوعة أخرى', categoryType: FinancialCategoryType.REVENUE, code: 'REV_OTHER', accountCode: '4006' },
  { nameAr: 'رواتب وأجور ومكافآت', categoryType: FinancialCategoryType.EXPENSE, code: 'EXP_SALARY', accountCode: '5001' },
  { nameAr: 'صيانة وإصلاحات', categoryType: FinancialCategoryType.EXPENSE, code: 'EXP_MAINTENANCE', accountCode: '5002' },
  { nameAr: 'وقود ومواصلات', categoryType: FinancialCategoryType.EXPENSE, code: 'EXP_FUEL', accountCode: '5003' },
  { nameAr: 'كهرباء ومياه وخدمات', categoryType: FinancialCategoryType.EXPENSE, code: 'EXP_UTILITIES', accountCode: '5006' },
  { nameAr: 'إيجارات', categoryType: FinancialCategoryType.EXPENSE, code: 'EXP_RENT', accountCode: '5006' },
  { nameAr: 'مشتريات وقرطاسية ولوازم', categoryType: FinancialCategoryType.EXPENSE, code: 'EXP_SUPPLIES', accountCode: '5004' },
  { nameAr: 'أثاث ومعدات وأجهزة', categoryType: FinancialCategoryType.EXPENSE, code: 'EXP_EQUIPMENT', accountCode: '5006' },
  { nameAr: 'تقنية معلومات وبرمجيات', categoryType: FinancialCategoryType.EXPENSE, code: 'EXP_IT', accountCode: '5006' },
  { nameAr: 'تدريب وتطوير مهني', categoryType: FinancialCategoryType.EXPENSE, code: 'EXP_TRAINING', accountCode: '5006' },
  { nameAr: 'طباعة ونسخ وتصوير', categoryType: FinancialCategoryType.EXPENSE, code: 'EXP_PRINTING', accountCode: '5006' },
  { nameAr: 'ضيافة واحتفالات وفعاليات', categoryType: FinancialCategoryType.EXPENSE, code: 'EXP_EVENTS', accountCode: '5006' },
  { nameAr: 'نظافة وتعقيم وأمن', categoryType: FinancialCategoryType.EXPENSE, code: 'EXP_CLEANING', accountCode: '5006' },
  { nameAr: 'نثريات ومصروفات متنوعة', categoryType: FinancialCategoryType.EXPENSE, code: 'EXP_MISC', accountCode: '5006' },
];

const FINANCIAL_FUNDS = [
  { nameAr: 'الصندوق الرئيسي العام', code: 'MAIN_FUND', fundType: FinancialFundType.MAIN },
  { nameAr: 'صندوق الرواتب والأجور', code: 'PAYROLL_FUND', fundType: FinancialFundType.MAIN },
  { nameAr: 'صندوق المساهمة المجتمعية', code: 'COMMUNITY_FUND', fundType: FinancialFundType.SUB },
  { nameAr: 'صندوق الرسوم الدراسية', code: 'TUITION_FUND', fundType: FinancialFundType.SUB },
  { nameAr: 'صندوق النقل المدرسي', code: 'TRANSPORT_FUND', fundType: FinancialFundType.SUB },
  { nameAr: 'صندوق الأنشطة والفعاليات', code: 'ACTIVITIES_FUND', fundType: FinancialFundType.SUB },
  { nameAr: 'صندوق الصيانة والتشغيل', code: 'MAINTENANCE_FUND', fundType: FinancialFundType.SUB },
  { nameAr: 'صندوق المشتريات واللوازم', code: 'PROCUREMENT_FUND', fundType: FinancialFundType.SUB },
  { nameAr: 'صندوق المقصف/الكافتيريا', code: 'CAFETERIA_FUND', fundType: FinancialFundType.SUB },
  { nameAr: 'صندوق التبرعات والمنح', code: 'DONATIONS_FUND', fundType: FinancialFundType.SUB },
  { nameAr: 'صندوق التطوير والتحسين', code: 'DEVELOPMENT_FUND', fundType: FinancialFundType.SUB },
  { nameAr: 'صندوق الطوارئ والاحتياطي', code: 'EMERGENCY_FUND', fundType: FinancialFundType.SUB },
];

export async function seedSystem07FinanceLegacy(prisma: PrismaClient) {
  for (const reason of EXEMPTION_REASONS) {
    await prisma.lookupExemptionReason.upsert({
      where: { code: reason.code },
      update: {
        nameAr: reason.nameAr,
        sortOrder: reason.sortOrder,
        isActive: true,
      },
      create: {
        nameAr: reason.nameAr,
        code: reason.code,
        sortOrder: reason.sortOrder,
        isActive: true,
      },
    });
  }

  for (const authority of EXEMPTION_AUTHORITIES) {
    await prisma.lookupExemptionAuthority.upsert({
      where: { code: authority.code },
      update: {
        nameAr: authority.nameAr,
      },
      create: {
        nameAr: authority.nameAr,
        code: authority.code,
      },
    });
  }

  for (const amount of CONTRIBUTION_AMOUNTS) {
    const existing = await prisma.lookupContributionAmount.findFirst({
      where: {
        nameAr: amount.nameAr,
        amountValue: amount.amountValue,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.lookupContributionAmount.update({
        where: { id: existing.id },
        data: {
          nameAr: amount.nameAr,
          amountValue: amount.amountValue,
          isActive: true,
        },
      });
      continue;
    }

    await prisma.lookupContributionAmount.create({
      data: {
        nameAr: amount.nameAr,
        amountValue: amount.amountValue,
        isActive: true,
      },
    });
  }

  const accountCodes = Array.from(
    new Set(FINANCIAL_CATEGORIES.map((category) => category.accountCode)),
  );

  const accounts = await prisma.chartOfAccount.findMany({
    where: { accountCode: { in: accountCodes } },
    select: { id: true, accountCode: true },
  });

  const accountsByCode = new Map(accounts.map((account) => [account.accountCode, account.id]));

  for (const category of FINANCIAL_CATEGORIES) {
    const coaAccountId = accountsByCode.get(category.accountCode) ?? null;

    await prisma.financialCategory.upsert({
      where: { code: category.code },
      update: {
        nameAr: category.nameAr,
        categoryType: category.categoryType,
        coaAccountId,
        isActive: true,
      },
      create: {
        nameAr: category.nameAr,
        categoryType: category.categoryType,
        code: category.code,
        coaAccountId,
        isActive: true,
      },
    });
  }

  for (const fund of FINANCIAL_FUNDS) {
    await prisma.financialFund.upsert({
      where: { code: fund.code },
      update: {
        nameAr: fund.nameAr,
        fundType: fund.fundType,
        isActive: true,
      },
      create: {
        nameAr: fund.nameAr,
        code: fund.code,
        fundType: fund.fundType,
        isActive: true,
      },
    });
  }
}
