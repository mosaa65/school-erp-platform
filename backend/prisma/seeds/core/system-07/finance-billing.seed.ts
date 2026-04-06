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
    taxNameAr: 'ضريبة القيمة المضافة 15%',
    taxNameEn: 'VAT 15%',
    rate: 15,
    taxType: TaxType.OUTPUT,
    outputAccountCode: '2104',
  },
  {
    taxNameAr: 'ضريبة القيمة المضافة 5%',
    taxNameEn: 'VAT 5%',
    rate: 5,
    taxType: TaxType.OUTPUT,
    outputAccountCode: '2104',
  },
  {
    taxNameAr: 'نسبة صفرية',
    taxNameEn: 'Zero Rated',
    rate: 0,
    taxType: TaxType.ZERO_RATED,
  },
  {
    taxNameAr: 'معفى من الضريبة',
    taxNameEn: 'Exempt',
    rate: 0,
    taxType: TaxType.EXEMPT,
  },
  {
    taxNameAr: 'ضريبة مدخلات 15%',
    taxNameEn: 'Input VAT 15%',
    rate: 15,
    taxType: TaxType.INPUT,
  },
];

const ACCOUNT_NAME_BY_CODE: Record<string, string> = {
  '2104': 'VAT Payable',
  '5007': 'Discount Expense',
  '4001': 'Tuition Revenue',
};

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
      nameEn: {
        in: Object.values(ACCOUNT_NAME_BY_CODE),
      },
    },
    select: {
      id: true,
      nameEn: true,
    },
  });

  const accountsByCode = new Map<string, number>();
  for (const [code, nameEn] of Object.entries(ACCOUNT_NAME_BY_CODE)) {
    const account = accounts.find((item) => item.nameEn === nameEn);
    if (account) {
      accountsByCode.set(code, account.id);
    }
  }

  for (const taxCode of DEFAULT_TAX_CODES) {
    const existing = await prisma.taxCode.findFirst({
      where: {
        taxNameAr: taxCode.taxNameAr,
        taxType: taxCode.taxType,
      },
      select: { id: true },
    });

    const data = {
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
    };

    if (existing) {
      await prisma.taxCode.update({
        where: { id: existing.id },
        data,
      });
      continue;
    }

    await prisma.taxCode.create({
      data: {
        ...data,
        effectiveTo: undefined,
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
