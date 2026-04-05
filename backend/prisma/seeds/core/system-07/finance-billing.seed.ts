import {
  DiscountAppliesToFeeType,
  DiscountCalculationMethod,
  DiscountType,
  FeeType,
  TaxType,
  type PrismaClient,
} from '@prisma/client';

const DEFAULT_TAX_CODES = [
  {
    taxCode: 'VAT15',
    taxNameAr: 'ضريبة القيمة المضافة 15%',
    taxNameEn: 'VAT 15%',
    rate: 15,
    taxType: TaxType.OUTPUT,
    outputAccountCode: '2104',
  },
  {
    taxCode: 'VAT5',
    taxNameAr: 'ضريبة القيمة المضافة 5%',
    taxNameEn: 'VAT 5%',
    rate: 5,
    taxType: TaxType.OUTPUT,
    outputAccountCode: '2104',
  },
  {
    taxCode: 'VAT0',
    taxNameAr: 'نسبة صفرية',
    taxNameEn: 'Zero Rated',
    rate: 0,
    taxType: TaxType.ZERO_RATED,
  },
  {
    taxCode: 'EXEMPT',
    taxNameAr: 'معفى من الضريبة',
    taxNameEn: 'Exempt',
    rate: 0,
    taxType: TaxType.EXEMPT,
  },
  {
    taxCode: 'VAT_IN15',
    taxNameAr: 'ضريبة مدخلات 15%',
    taxNameEn: 'Input VAT 15%',
    rate: 15,
    taxType: TaxType.INPUT,
  },
];

const DEFAULT_DISCOUNT_RULES = [
  {
    nameAr: 'خصم الإخوة 10%',
    discountType: DiscountType.SIBLING,
    calculationMethod: DiscountCalculationMethod.PERCENTAGE,
    value: 10,
    appliesToFeeType: DiscountAppliesToFeeType.TUITION,
    siblingOrderFrom: 2,
    maxDiscountPercentage: 10,
    requiresApproval: false,
  },
  {
    nameAr: 'خصم الإخوة 20%',
    discountType: DiscountType.SIBLING,
    calculationMethod: DiscountCalculationMethod.PERCENTAGE,
    value: 20,
    appliesToFeeType: DiscountAppliesToFeeType.TUITION,
    siblingOrderFrom: 3,
    maxDiscountPercentage: 20,
    requiresApproval: true,
  },
];

export async function seedSystem07FinanceBilling(prisma: PrismaClient) {
  const accounts = await prisma.chartOfAccount.findMany({
    where: {
      accountCode: {
        in: ['2104', '5007', '4001'],
      },
    },
    select: {
      id: true,
      accountCode: true,
    },
  });

  const accountsByCode = new Map(accounts.map((account) => [account.accountCode, account.id]));

  for (const taxCode of DEFAULT_TAX_CODES) {
    await prisma.taxCode.upsert({
      where: { taxCode: taxCode.taxCode },
      update: {
        taxNameAr: taxCode.taxNameAr,
        taxNameEn: taxCode.taxNameEn,
        rate: taxCode.rate,
        taxType: taxCode.taxType,
        isInclusive: false,
        outputGlAccountId: taxCode.outputAccountCode
          ? accountsByCode.get(taxCode.outputAccountCode) ?? null
          : null,
        inputGlAccountId: null,
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
        isActive: true,
      },
      create: {
        taxCode: taxCode.taxCode,
        taxNameAr: taxCode.taxNameAr,
        taxNameEn: taxCode.taxNameEn,
        rate: taxCode.rate,
        taxType: taxCode.taxType,
        isInclusive: false,
        outputGlAccountId: taxCode.outputAccountCode
          ? accountsByCode.get(taxCode.outputAccountCode) ?? null
          : null,
        inputGlAccountId: null,
        effectiveFrom: new Date('2026-01-01'),
        isActive: true,
      },
    });
  }

  const academicYear = await prisma.academicYear.findFirst({
    where: {
      isCurrent: true,
      deletedAt: null,
    },
    orderBy: { startDate: 'desc' },
  });

  const baseCurrency = await prisma.currency.findFirst({
    where: {
      isBase: true,
      deletedAt: null,
    },
    orderBy: { id: 'asc' },
  });

  for (const rule of DEFAULT_DISCOUNT_RULES) {
    const existing = await prisma.discountRule.findFirst({
      where: {
        nameAr: rule.nameAr,
        discountType: rule.discountType,
      },
      select: { id: true },
    });

    const data = {
      nameAr: rule.nameAr,
      discountType: rule.discountType,
      calculationMethod: rule.calculationMethod,
      value: rule.value,
      appliesToFeeType: rule.appliesToFeeType,
      siblingOrderFrom: rule.siblingOrderFrom,
      maxDiscountPercentage: rule.maxDiscountPercentage,
      requiresApproval: rule.requiresApproval,
      discountGlAccountId: accountsByCode.get('5007') ?? null,
      contraGlAccountId: accountsByCode.get('4001') ?? null,
      academicYearId: academicYear?.id ?? null,
      isActive: true,
    };

    if (existing) {
      await prisma.discountRule.update({
        where: { id: existing.id },
        data,
      });
      continue;
    }

    await prisma.discountRule.create({ data });
  }

  if (!academicYear) {
    return;
  }

  const gradeLevels = await prisma.gradeLevel.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    orderBy: { sequence: 'asc' },
  });

  for (const gradeLevel of gradeLevels) {
    const existing = await prisma.feeStructure.findFirst({
      where: {
        academicYearId: academicYear.id,
        gradeLevelId: gradeLevel.id,
        feeType: FeeType.TUITION,
        nameAr: 'رسوم دراسية',
      },
      select: { id: true },
    });

    const amount = Number((1000 + gradeLevel.sequence * 50).toFixed(2));

    const data = {
      academicYearId: academicYear.id,
      gradeLevelId: gradeLevel.id,
      feeType: FeeType.TUITION,
      nameAr: 'رسوم دراسية',
      amount,
      currencyId: baseCurrency?.id ?? null,
      vatRate: 15,
      isActive: true,
    };

    if (existing) {
      await prisma.feeStructure.update({
        where: { id: existing.id },
        data,
      });
      continue;
    }

    await prisma.feeStructure.create({ data });
  }
}
