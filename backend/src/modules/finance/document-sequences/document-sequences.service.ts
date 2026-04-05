import { Injectable } from '@nestjs/common';
import {
  DocumentType,
  Prisma,
  type DocumentSequence,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

interface ReserveDocumentNumberOptions {
  tx?: Prisma.TransactionClient;
  branchId?: number | null;
  fiscalYearId?: number | null;
  date?: Date;
  prefixOverride?: string;
  numberFormatOverride?: string;
}

const DEFAULT_NUMBER_FORMAT = '{PREFIX}-{YEAR}-{SEQ:5}';

const DEFAULT_PREFIX_BY_DOCUMENT_TYPE: Record<DocumentType, string> = {
  JOURNAL_ENTRY: 'JE',
  INVOICE: 'INV',
  PAYMENT: 'TXN',
  CREDIT_NOTE: 'CN',
  DEBIT_NOTE: 'DN',
  RECEIPT: 'RCP',
};

@Injectable()
export class DocumentSequencesService {
  constructor(private readonly prisma: PrismaService) {}

  async reserveNextNumber(
    documentType: DocumentType,
    options: ReserveDocumentNumberOptions = {},
  ): Promise<string> {
    const client = options.tx ?? this.prisma;
    const referenceDate = options.date ?? new Date();
    const targetFiscalYearId =
      options.fiscalYearId ?? (await this.resolveFiscalYearId(client, referenceDate));
    const targetBranchId = options.branchId ?? null;

    const sequence =
      (await this.findBestSequence(
        client,
        documentType,
        targetBranchId,
        targetFiscalYearId,
      )) ??
      (await client.documentSequence.create({
        data: {
          documentType,
          prefix: DEFAULT_PREFIX_BY_DOCUMENT_TYPE[documentType],
          branchId: targetBranchId,
          fiscalYearId: targetFiscalYearId,
          numberFormat: DEFAULT_NUMBER_FORMAT,
          isActive: true,
        },
      }));

    const updatedSequence = await client.documentSequence.update({
      where: { id: sequence.id },
      data: {
        lastNumber: { increment: 1 },
      },
      select: {
        id: true,
        prefix: true,
        lastNumber: true,
        numberFormat: true,
        fiscalYearId: true,
      },
    });

    const yearToken = await this.resolveYearToken(
      client,
      updatedSequence.fiscalYearId,
      referenceDate,
    );

    return this.formatDocumentNumber(
      options.numberFormatOverride ?? updatedSequence.numberFormat,
      options.prefixOverride ?? updatedSequence.prefix,
      updatedSequence.lastNumber,
      yearToken,
    );
  }

  private async findBestSequence(
    client: PrismaExecutor,
    documentType: DocumentType,
    branchId: number | null,
    fiscalYearId: number | null,
  ): Promise<DocumentSequence | null> {
    const candidates = await client.documentSequence.findMany({
      where: {
        documentType,
        isActive: true,
        OR: [
          {
            branchId: branchId === null ? null : branchId,
            fiscalYearId: fiscalYearId === null ? null : fiscalYearId,
          },
          {
            branchId: null,
            fiscalYearId: fiscalYearId === null ? null : fiscalYearId,
          },
          {
            branchId: branchId === null ? null : branchId,
            fiscalYearId: null,
          },
          {
            branchId: null,
            fiscalYearId: null,
          },
        ],
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });

    if (candidates.length === 0) {
      return null;
    }

    return [...candidates].sort((left, right) => {
      const scoreDiff =
        this.sequenceSpecificityScore(right, branchId, fiscalYearId) -
        this.sequenceSpecificityScore(left, branchId, fiscalYearId);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return right.id - left.id;
    })[0];
  }

  private sequenceSpecificityScore(
    sequence: Pick<DocumentSequence, 'branchId' | 'fiscalYearId'>,
    branchId: number | null,
    fiscalYearId: number | null,
  ) {
    let score = 0;

    if (sequence.branchId === branchId) {
      score += 10;
    } else if (sequence.branchId !== null) {
      score -= 10;
    }

    if (sequence.fiscalYearId === fiscalYearId) {
      score += 5;
    } else if (sequence.fiscalYearId !== null) {
      score -= 5;
    }

    return score;
  }

  private async resolveFiscalYearId(
    client: PrismaExecutor,
    referenceDate: Date,
  ): Promise<number | null> {
    const fiscalYear = await client.fiscalYear.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        startDate: { lte: referenceDate },
        endDate: { gte: referenceDate },
      },
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });

    return fiscalYear?.id ?? null;
  }

  private async resolveYearToken(
    client: PrismaExecutor,
    fiscalYearId: number | null,
    referenceDate: Date,
  ): Promise<string> {
    if (fiscalYearId) {
      const fiscalYear = await client.fiscalYear.findUnique({
        where: { id: fiscalYearId },
        select: { startDate: true },
      });

      if (fiscalYear) {
        return fiscalYear.startDate.getFullYear().toString();
      }
    }

    return referenceDate.getFullYear().toString();
  }

  private formatDocumentNumber(
    numberFormat: string,
    prefix: string,
    sequenceNumber: number,
    yearToken: string,
  ): string {
    return (numberFormat || DEFAULT_NUMBER_FORMAT)
      .replaceAll('{PREFIX}', prefix)
      .replaceAll('{YEAR}', yearToken)
      .replace(/\{SEQ(?::(\d+))?\}/g, (_, widthText?: string) => {
        const width = widthText ? Number(widthText) : 0;
        const raw = sequenceNumber.toString();

        return width > 0 ? raw.padStart(width, '0') : raw;
      });
  }
}
