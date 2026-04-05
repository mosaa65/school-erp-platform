import { PaymentGatewayType, type PrismaClient } from '@prisma/client';

const DEFAULT_PAYMENT_GATEWAYS = [
  {
    providerCode: 'CASH',
    nameAr: 'نقدي',
    nameEn: 'Cash',
    gatewayType: PaymentGatewayType.OFFLINE,
    settlementAccountCode: '1101',
  },
  {
    providerCode: 'BANK_TRANSFER',
    nameAr: 'تحويل بنكي',
    nameEn: 'Bank Transfer',
    gatewayType: PaymentGatewayType.OFFLINE,
    settlementAccountCode: '1101',
  },
  {
    providerCode: 'ONLINE_GW',
    nameAr: 'بوابة إلكترونية',
    nameEn: 'Online Gateway',
    gatewayType: PaymentGatewayType.ONLINE,
    settlementAccountCode: '1102',
  },
];

export async function seedSystem07PaymentGateways(prisma: PrismaClient) {
  const accounts = await prisma.chartOfAccount.findMany({
    where: {
      accountCode: {
        in: ['1101', '1102'],
      },
    },
    select: {
      id: true,
      accountCode: true,
    },
  });

  const accountsByCode = new Map(accounts.map((account) => [account.accountCode, account.id]));

  for (const gateway of DEFAULT_PAYMENT_GATEWAYS) {
    await prisma.paymentGateway.upsert({
      where: {
        providerCode: gateway.providerCode,
      },
      update: {
        nameAr: gateway.nameAr,
        nameEn: gateway.nameEn,
        gatewayType: gateway.gatewayType,
        apiEndpoint: null,
        merchantId: null,
        settlementAccountId: accountsByCode.get(gateway.settlementAccountCode) ?? null,
        isActive: true,
      },
      create: {
        providerCode: gateway.providerCode,
        nameAr: gateway.nameAr,
        nameEn: gateway.nameEn,
        gatewayType: gateway.gatewayType,
        settlementAccountId: accountsByCode.get(gateway.settlementAccountCode) ?? null,
        isActive: true,
      },
    });
  }
}
