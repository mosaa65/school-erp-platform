import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountType,
  AcademicYearStatus,
  DocumentType,
  FiscalPeriodStatus,
  FiscalPeriodType,
  GradeStage,
  GuardianRelationship,
  NormalBalance,
  PaymentGatewayType,
  PrismaClient,
  StudentGender,
} from '@prisma/client';
import { json } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

const ADMIN_EMAIL = 'admin@school.local';
const ADMIN_PASSWORD = 'ChangeMe123!';

(BigInt.prototype as unknown as { toJSON?: () => string }).toJSON =
  function toJSON() {
    return this.toString();
  };

type LoginBody = {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
};

export type FinanceE2eContext = {
  app: INestApplication<App>;
  prisma: PrismaClient;
  accessToken: string;
  adminUserId: string;
  httpServer: () => App;
};

export type FinanceJournalFixture = {
  suffix: string;
  startDate: Date;
  branchId: number;
  fiscalYearId: number;
  fiscalPeriodId: number;
  debitAccountId: number;
  creditAccountId: number;
};

export type FinanceBillingFixture = FinanceJournalFixture & {
  academicYearId: string;
  gradeLevelId: string;
  sectionId: string;
  studentId: string;
  guardianId: string;
  studentGuardianId: string;
  enrollmentId: string;
  gatewayId: number;
  gatewayProviderCode: string;
  currencyId: number;
  revenueAccountId: number;
  createdRevenueAccountId: number | null;
  createdCurrencyId: number | null;
};

export async function bootstrapFinanceE2eContext(): Promise<FinanceE2eContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.use(
    json({
      verify: (req, _res, buf) => {
        (req as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();

  const prisma = new PrismaClient();
  const httpServer = () => app.getHttpServer();

  const loginResponse = await request(httpServer())
    .post('/auth/login')
    .send({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    })
    .expect(200);

  const loginBody = loginResponse.body as LoginBody;

  return {
    app,
    prisma,
    accessToken: loginBody.accessToken,
    adminUserId: loginBody.user.id,
    httpServer,
  };
}

export async function teardownFinanceE2eContext(
  context: FinanceE2eContext | null,
) {
  if (!context) {
    return;
  }

  await context.prisma.$disconnect();
  await context.app.close();
}

export async function createFinanceJournalFixture(
  context: FinanceE2eContext,
): Promise<FinanceJournalFixture> {
  const suffix = createUniqueSuffix();
  const branchCode = `B${suffix.slice(-6)}`.slice(0, 10);
  const debitAccountCode = `TDE${suffix.slice(-8)}`.slice(0, 20);
  const creditAccountCode = `TCR${suffix.slice(-8)}`.slice(0, 20);

  const startDate = buildUniqueStartDate(suffix);
  const fiscalYearEndDate = new Date(startDate);
  fiscalYearEndDate.setUTCFullYear(fiscalYearEndDate.getUTCFullYear() + 1);
  fiscalYearEndDate.setUTCDate(fiscalYearEndDate.getUTCDate() - 1);

  const fiscalPeriodEndDate = new Date(startDate);
  fiscalPeriodEndDate.setUTCDate(fiscalPeriodEndDate.getUTCDate() + 29);

  const branch = await context.prisma.branch.create({
    data: {
      code: branchCode,
      nameAr: `فرع اختبار ${suffix}`,
      nameEn: `Finance Test Branch ${suffix}`,
      isHeadquarters: false,
      isActive: true,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: {
      id: true,
    },
  });

  const fiscalYear = await context.prisma.fiscalYear.create({
    data: {
      nameAr: `السنة المالية ${suffix}`.slice(0, 50),
      startDate,
      endDate: fiscalYearEndDate,
      isClosed: false,
      isActive: true,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: {
      id: true,
    },
  });

  const fiscalPeriod = await context.prisma.fiscalPeriod.create({
    data: {
      fiscalYearId: fiscalYear.id,
      periodNumber: 1,
      nameAr: `الفترة 1 ${suffix}`.slice(0, 50),
      periodType: FiscalPeriodType.MONTHLY,
      startDate,
      endDate: fiscalPeriodEndDate,
      status: FiscalPeriodStatus.OPEN,
      isActive: true,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: {
      id: true,
    },
  });

  const debitAccount = await context.prisma.chartOfAccount.create({
    data: {
      accountCode: debitAccountCode,
      nameAr: `مصروف اختبار ${suffix}`,
      nameEn: `Finance Test Debit ${suffix}`,
      accountType: AccountType.EXPENSE,
      hierarchyLevel: 1,
      isHeader: false,
      isBankAccount: false,
      normalBalance: NormalBalance.DEBIT,
      currentBalance: 0,
      isSystem: false,
      isActive: true,
      branchId: branch.id,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: {
      id: true,
    },
  });

  const creditAccount = await context.prisma.chartOfAccount.create({
    data: {
      accountCode: creditAccountCode,
      nameAr: `إيراد اختبار ${suffix}`,
      nameEn: `Finance Test Credit ${suffix}`,
      accountType: AccountType.REVENUE,
      hierarchyLevel: 1,
      isHeader: false,
      isBankAccount: false,
      normalBalance: NormalBalance.CREDIT,
      currentBalance: 0,
      isSystem: false,
      isActive: true,
      branchId: branch.id,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: {
      id: true,
    },
  });

  return {
    suffix,
    startDate,
    branchId: branch.id,
    fiscalYearId: fiscalYear.id,
    fiscalPeriodId: fiscalPeriod.id,
    debitAccountId: debitAccount.id,
    creditAccountId: creditAccount.id,
  };
}

export async function cleanupFinanceJournalFixture(
  context: FinanceE2eContext,
  fixture: FinanceJournalFixture | null,
) {
  if (!fixture) {
    return;
  }

  const relatedJournalEntryIds = await findJournalEntryIdsByAccounts(context, [
    fixture.debitAccountId,
    fixture.creditAccountId,
  ]);

  await context.prisma.journalEntry.deleteMany({
    where: {
      OR: [
        {
          fiscalYearId: fixture.fiscalYearId,
          branchId: fixture.branchId,
        },
        relatedJournalEntryIds.length > 0
          ? {
              id: {
                in: relatedJournalEntryIds,
              },
            }
          : {
              id: '__finance_cleanup_noop__',
            },
      ],
    },
  });

  await context.prisma.documentSequence.deleteMany({
    where: {
      documentType: DocumentType.JOURNAL_ENTRY,
      fiscalYearId: fixture.fiscalYearId,
      branchId: fixture.branchId,
    },
  });

  await context.prisma.chartOfAccount.deleteMany({
    where: {
      id: {
        in: [fixture.debitAccountId, fixture.creditAccountId],
      },
    },
  });

  await context.prisma.fiscalPeriod.delete({
    where: {
      id: fixture.fiscalPeriodId,
    },
  });

  await context.prisma.fiscalYear.delete({
    where: {
      id: fixture.fiscalYearId,
    },
  });

  await context.prisma.branch.delete({
    where: {
      id: fixture.branchId,
    },
  });
}

export async function createFinanceBillingFixture(
  context: FinanceE2eContext,
): Promise<FinanceBillingFixture> {
  const journalFixture = await createFinanceJournalFixture(context);
  const suffix = journalFixture.suffix;
  const currency = await ensureFinanceCurrency(context);
  const revenueAccount = await ensureFinancePostingAccountByCode(context, {
    accountCode: '4001',
    nameAr: 'إيراد الرسوم الافتراضي',
    nameEn: 'Default Tuition Revenue',
    accountType: AccountType.REVENUE,
    normalBalance: NormalBalance.CREDIT,
  });

  const academicYearEndDate = addUtcDays(journalFixture.startDate, 270);
  const gradeLevelSequence = Number(suffix.slice(-6));

  const academicYear = await context.prisma.academicYear.create({
    data: {
      code: `AY${suffix.slice(-8)}`.slice(0, 40),
      name: `عام اختباري ${suffix}`.slice(0, 120),
      startDate: journalFixture.startDate,
      endDate: academicYearEndDate,
      status: AcademicYearStatus.ACTIVE,
      isCurrent: false,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: {
      id: true,
    },
  });

  const gradeLevel = await context.prisma.gradeLevel.create({
    data: {
      code: `GL${suffix.slice(-8)}`.slice(0, 40),
      name: `المستوى ${suffix.slice(-6)}`.slice(0, 120),
      stage: GradeStage.OTHER,
      sequence: gradeLevelSequence,
      isActive: true,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const section = await context.prisma.section.create({
    data: {
      gradeLevelId: gradeLevel.id,
      code: `SEC${suffix.slice(-6)}`.slice(0, 40),
      name: `الشعبة ${suffix.slice(-6)}`.slice(0, 120),
      isActive: true,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const student = await context.prisma.student.create({
    data: {
      admissionNo: `ADM${suffix.slice(-8)}`.slice(0, 40),
      fullName: `طالب مالية ${suffix}`.slice(0, 150),
      gender: StudentGender.MALE,
      isActive: true,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: {
      id: true,
    },
  });

  const guardian = await context.prisma.guardian.create({
    data: {
      fullName: `ولي أمر ${suffix}`.slice(0, 150),
      gender: StudentGender.FEMALE,
      phonePrimary: `5${suffix.slice(-8)}`.slice(0, 20),
      isActive: true,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: {
      id: true,
    },
  });

  const studentGuardian = await context.prisma.studentGuardian.create({
    data: {
      studentId: student.id,
      guardianId: guardian.id,
      relationship: GuardianRelationship.MOTHER,
      isPrimary: true,
      isActive: true,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: {
      id: true,
    },
  });

  const enrollment = await context.prisma.studentEnrollment.create({
    data: {
      studentId: student.id,
      academicYearId: academicYear.id,
      gradeLevelId: gradeLevel.id,
      sectionId: section.id,
      yearlyEnrollmentNo: `ENR${suffix.slice(-8)}`.slice(0, 40),
      gradeNameSnapshot: gradeLevel.name,
      sectionNameSnapshot: section.name,
      enrollmentDate: journalFixture.startDate,
      status: 'ACTIVE',
      isActive: true,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: {
      id: true,
    },
  });

  const gateway = await context.prisma.paymentGateway.create({
    data: {
      nameAr: `بوابة فوترة ${suffix}`.slice(0, 100),
      nameEn: `Billing Test Gateway ${suffix}`.slice(0, 100),
      providerCode: `BPG${suffix.slice(-8)}`.slice(0, 20),
      gatewayType: PaymentGatewayType.ONLINE,
      settlementAccountId: journalFixture.debitAccountId,
      isActive: true,
    },
    select: {
      id: true,
      providerCode: true,
    },
  });

  return {
    ...journalFixture,
    academicYearId: academicYear.id,
    gradeLevelId: gradeLevel.id,
    sectionId: section.id,
    studentId: student.id,
    guardianId: guardian.id,
    studentGuardianId: studentGuardian.id,
    enrollmentId: enrollment.id,
    gatewayId: gateway.id,
    gatewayProviderCode: gateway.providerCode,
    currencyId: currency.id,
    revenueAccountId: revenueAccount.id,
    createdRevenueAccountId: revenueAccount.created ? revenueAccount.id : null,
    createdCurrencyId: currency.created ? currency.id : null,
  };
}

export async function cleanupFinanceBillingFixture(
  context: FinanceE2eContext,
  fixture: FinanceBillingFixture | null,
) {
  if (!fixture) {
    return;
  }

  await context.prisma.paymentWebhookEvent.deleteMany({
    where: {
      OR: [
        {
          gatewayId: fixture.gatewayId,
        },
        {
          transactionId: {
            in: (
              await context.prisma.paymentTransaction.findMany({
                where: {
                  OR: [
                    { gatewayId: fixture.gatewayId },
                    { enrollmentId: fixture.enrollmentId },
                    { invoice: { enrollmentId: fixture.enrollmentId } },
                  ],
                },
                select: { id: true },
              })
            ).map((transaction) => transaction.id),
          },
        },
      ],
    },
  });

  await context.prisma.paymentTransaction.deleteMany({
    where: {
      OR: [
        { gatewayId: fixture.gatewayId },
        { enrollmentId: fixture.enrollmentId },
        { invoice: { enrollmentId: fixture.enrollmentId } },
      ],
    },
  });

  await context.prisma.journalEntry.deleteMany({
    where: {
      fiscalYearId: fixture.fiscalYearId,
      referenceType: 'PAYMENT_TRANSACTION',
    },
  });

  await context.prisma.studentInvoice.deleteMany({
    where: {
      enrollmentId: fixture.enrollmentId,
    },
  });

  await context.prisma.paymentGateway.delete({
    where: {
      id: fixture.gatewayId,
    },
  });

  await context.prisma.studentGuardian.delete({
    where: {
      id: fixture.studentGuardianId,
    },
  });

  await context.prisma.studentEnrollment.delete({
    where: {
      id: fixture.enrollmentId,
    },
  });

  await context.prisma.guardian.delete({
    where: {
      id: fixture.guardianId,
    },
  });

  await context.prisma.student.delete({
    where: {
      id: fixture.studentId,
    },
  });

  await context.prisma.section.delete({
    where: {
      id: fixture.sectionId,
    },
  });

  await context.prisma.gradeLevel.delete({
    where: {
      id: fixture.gradeLevelId,
    },
  });

  await context.prisma.academicYear.delete({
    where: {
      id: fixture.academicYearId,
    },
  });

  await context.prisma.documentSequence.deleteMany({
    where: {
      fiscalYearId: fixture.fiscalYearId,
      documentType: {
        in: [
          DocumentType.INVOICE,
          DocumentType.PAYMENT,
          DocumentType.RECEIPT,
          DocumentType.JOURNAL_ENTRY,
        ],
      },
    },
  });

  if (fixture.createdCurrencyId) {
    await context.prisma.currency.delete({
      where: {
        id: fixture.createdCurrencyId,
      },
    });
  }

  if (fixture.createdRevenueAccountId) {
    await context.prisma.chartOfAccount.delete({
      where: {
        id: fixture.createdRevenueAccountId,
      },
    });
  }

  await cleanupFinanceJournalFixture(context, fixture);
}

export function createFinanceAuthHeader(context: FinanceE2eContext) {
  return {
    Authorization: `Bearer ${context.accessToken}`,
  };
}

export function decimalToNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  if (value && typeof value === 'object') {
    const decimalLike = value as { toNumber?: () => number };
    if (typeof decimalLike.toNumber === 'function') {
      return decimalLike.toNumber();
    }
  }

  return Number(value);
}

export function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function deleteJournalEntriesForAccounts(
  context: FinanceE2eContext,
  accountIds: number[],
) {
  const journalEntryIds = await findJournalEntryIdsByAccounts(context, accountIds);

  if (journalEntryIds.length === 0) {
    return;
  }

  await context.prisma.journalEntry.deleteMany({
    where: {
      id: {
        in: journalEntryIds,
      },
    },
  });
}

function createUniqueSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

function buildUniqueStartDate(suffix: string) {
  const numeric = BigInt(suffix.slice(-10));
  const year = 2040 + Number(numeric % 40n);
  const month = Number((numeric / 40n) % 12n);
  const day = Number((numeric / 480n) % 28n) + 1;
  const startDate = new Date(Date.UTC(year, month, day));

  return startDate;
}

function addUtcDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);

  return result;
}

async function ensureFinanceCurrency(context: FinanceE2eContext) {
  const existing = await context.prisma.currency.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
    },
    orderBy: [{ isBase: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
    },
  });

  if (existing) {
    return {
      id: existing.id,
      created: false,
    };
  }

  const created = await context.prisma.currency.create({
    data: {
      code: 'TST',
      nameAr: 'عملة اختبار',
      symbol: 'TS',
      decimalPlaces: 2,
      isBase: true,
      isActive: true,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: {
      id: true,
    },
  });

  return {
    id: created.id,
    created: true,
  };
}

async function findJournalEntryIdsByAccounts(
  context: FinanceE2eContext,
  accountIds: number[],
) {
  if (accountIds.length === 0) {
    return [];
  }

  const lines = await context.prisma.journalEntryLine.findMany({
    where: {
      accountId: {
        in: accountIds,
      },
    },
    select: {
      journalEntryId: true,
    },
  });

  return Array.from(new Set(lines.map((line) => line.journalEntryId)));
}

export async function ensureFinancePostingAccountByCode(
  context: FinanceE2eContext,
  input: {
    accountCode: string;
    nameAr: string;
    nameEn: string;
    accountType: AccountType;
    normalBalance: NormalBalance;
  },
) {
  const existing = await context.prisma.chartOfAccount.findFirst({
    where: {
      accountCode: input.accountCode,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return {
      id: existing.id,
      created: false,
    };
  }

  const created = await context.prisma.chartOfAccount.create({
    data: {
      accountCode: input.accountCode,
      nameAr: input.nameAr,
      nameEn: input.nameEn,
      accountType: input.accountType,
      hierarchyLevel: 1,
      isHeader: false,
      isBankAccount: false,
      normalBalance: input.normalBalance,
      currentBalance: 0,
      isSystem: false,
      isActive: true,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: {
      id: true,
    },
  });

  return {
    id: created.id,
    created: true,
  };
}
