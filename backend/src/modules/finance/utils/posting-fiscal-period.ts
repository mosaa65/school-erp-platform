import { BadRequestException } from '@nestjs/common';
import { FiscalPeriodStatus, Prisma } from '@prisma/client';

type PostingFiscalPeriodDb = {
  fiscalYear: {
    findFirst(args: Prisma.FiscalYearFindFirstArgs): Promise<{
      id: number;
      startDate: Date;
      endDate: Date;
    } | null>;
  };
  fiscalPeriod: {
    findFirst(args: Prisma.FiscalPeriodFindFirstArgs): Promise<{
      id: number;
      fiscalYearId: number;
      nameAr: string;
      status: FiscalPeriodStatus;
    } | null>;
  };
};

function isOpenPostingStatus(status: FiscalPeriodStatus) {
  return (
    status === FiscalPeriodStatus.OPEN ||
    status === FiscalPeriodStatus.REOPENED
  );
}

function formatPeriodName(period: { id: number; nameAr: string }) {
  return period.nameAr?.trim() ? `"${period.nameAr}"` : `#${period.id}`;
}

export async function findActiveFiscalYearForDate(
  db: PostingFiscalPeriodDb,
  date: Date,
  contextLabel: string,
) {
  const fiscalYear = await db.fiscalYear.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      startDate: { lte: date },
      endDate: { gte: date },
    },
    orderBy: { startDate: 'desc' },
  });

  if (!fiscalYear) {
    throw new BadRequestException(
      `No fiscal year configured for ${contextLabel}`,
    );
  }

  return fiscalYear;
}

export async function findPostingFiscalPeriodForDate(
  db: PostingFiscalPeriodDb,
  fiscalYearId: number,
  date: Date,
  contextLabel: string,
) {
  const period = await db.fiscalPeriod.findFirst({
    where: {
      fiscalYearId,
      deletedAt: null,
      isActive: true,
      startDate: { lte: date },
      endDate: { gte: date },
    },
    select: {
      id: true,
      fiscalYearId: true,
      nameAr: true,
      status: true,
    },
    orderBy: { startDate: 'desc' },
  });

  if (!period) {
    return null;
  }

  if (!isOpenPostingStatus(period.status)) {
    throw new BadRequestException(
      `Cannot post ${contextLabel} because fiscal period ${formatPeriodName(period)} is ${period.status}.`,
    );
  }

  return period;
}

export async function ensurePostingFiscalPeriod(
  db: PostingFiscalPeriodDb,
  fiscalPeriodId: number,
  contextLabel: string,
) {
  const period = await db.fiscalPeriod.findFirst({
    where: {
      id: fiscalPeriodId,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      fiscalYearId: true,
      nameAr: true,
      status: true,
    },
  });

  if (!period) {
    throw new BadRequestException('Fiscal period not found');
  }

  if (!isOpenPostingStatus(period.status)) {
    throw new BadRequestException(
      `Cannot post ${contextLabel} because fiscal period ${formatPeriodName(period)} is ${period.status}.`,
    );
  }

  return period;
}
