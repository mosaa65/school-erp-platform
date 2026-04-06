import { PaymentGatewayType, type PrismaClient } from '@prisma/client';

const DEFAULT_PAYMENT_GATEWAYS = [
  {
    nameAr: 'نقدي',
    nameEn: 'Cash',
    gatewayType: PaymentGatewayType.OFFLINE,
    settlementAccountCode: '1101',
  },
  {
    nameAr: 'تحويل بنكي',
    nameEn: 'Bank Transfer',
    gatewayType: PaymentGatewayType.OFFLINE,
    settlementAccountCode: '1101',
  },
  {
    nameAr: 'بوابة إلكترونية',
    nameEn: 'Online Gateway',
    gatewayType: PaymentGatewayType.ONLINE,
    settlementAccountCode: '1102',
  },
];

const ACCOUNT_NAME_BY_CODE: Record<string, string> = {
  '1101': 'Cash and Banks',
  '1102': 'Electronic Payment Gateways',
};

export async function seedSystem07PaymentGateways(prisma: PrismaClient) {
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

  for (const gateway of DEFAULT_PAYMENT_GATEWAYS) {
    const existing = await prisma.paymentGateway.findFirst({
      where: {
        nameAr: gateway.nameAr,
        gatewayType: gateway.gatewayType,
      },
      select: { id: true },
    });

    const data = {
      nameAr: gateway.nameAr,
      nameEn: gateway.nameEn,
      gatewayType: gateway.gatewayType,
      apiEndpoint: null,
      merchantId: null,
      settlementAccountId: accountsByCode.get(gateway.settlementAccountCode) ?? null,
      isActive: true,
    };

    if (existing) {
      await prisma.paymentGateway.update({
        where: { id: existing.id },
        data,
      });
      continue;
    }

    await prisma.paymentGateway.create({ data });
  }
}
