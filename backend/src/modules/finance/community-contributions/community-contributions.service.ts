import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  FinancialCategoryType,
  FeeType,
  InvoiceStatus,
  PaymentMethod,
  PaymentTransactionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PaymentTransactionsService } from '../payment-transactions/payment-transactions.service';
import { StudentInvoicesService } from '../student-invoices/student-invoices.service';
import { CreateCommunityContributionDto } from './dto/create-community-contribution.dto';
import { ListCommunityContributionsDto } from './dto/list-community-contributions.dto';
import { UpdateCommunityContributionDto } from './dto/update-community-contribution.dto';

const communityContributionInclude: Prisma.CommunityContributionInclude = {
  enrollment: {
    select: {
      id: true,
      studentId: true,
      status: true,
    },
  },
  academicYear: {
    select: {
      id: true,
      name: true,
    },
  },
  semester: {
    select: {
      id: true,
      name: true,
      termType: true,
    },
  },
  month: {
    select: {
      id: true,
      name: true,
      sequence: true,
    },
  },
  week: {
    select: {
      id: true,
      nameAr: true,
    },
  },
  requiredAmount: {
    select: {
      id: true,
      nameAr: true,
      amountValue: true,
    },
  },
  exemptionReason: {
    select: {
      id: true,
      nameAr: true,
      code: true,
    },
  },
  exemptionAuthority: {
    select: {
      id: true,
      nameAr: true,
      code: true,
    },
  },
  recipientEmployee: {
    select: {
      id: true,
      fullName: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      email: true,
    },
  },
  invoice: {
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      status: true,
    },
  },
  journalEntry: {
    select: {
      id: true,
      entryNumber: true,
      status: true,
    },
  },
};

const CASH_GATEWAY_NAME_EN = 'Cash';
const CASH_GATEWAY_NAME_AR = 'نقدي';
const COMMUNITY_REVENUE_ACCOUNT_NAME_EN = 'Community Contribution Revenue';
const COMMUNITY_REVENUE_ACCOUNT_NAME_AR = 'إيراد المساهمة المجتمعية';

@Injectable()
export class CommunityContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly studentInvoicesService: StudentInvoicesService,
    private readonly paymentTransactionsService: PaymentTransactionsService,
  ) {}

  async create(payload: CreateCommunityContributionDto, actorUserId: string) {
    await this.ensureContributionUnique(payload.enrollmentId, payload.monthId);

    if (payload.autoBridge && (payload.invoiceId || payload.journalEntryId)) {
      throw new BadRequestException(
        'autoBridge cannot be combined with manual invoiceId or journalEntryId',
      );
    }

    let invoiceId = this.parseOptionalBigInt(payload.invoiceId, 'invoiceId');
    let journalEntryId: string | null | undefined = payload.journalEntryId;

    if (invoiceId) {
      await this.ensureInvoiceExists(invoiceId);
    }

    if (journalEntryId) {
      await this.ensureJournalEntryExists(journalEntryId);
    }

    if (payload.autoBridge) {
      const bridgeResult = await this.createAutoBridgeArtifacts(
        payload,
        actorUserId,
      );
      invoiceId = bridgeResult.invoiceId;
      journalEntryId = bridgeResult.journalEntryId;
    }

    try {
      const contribution = await this.prisma.communityContribution.create({
        data: {
          enrollmentId: payload.enrollmentId,
          academicYearId: payload.academicYearId,
          semesterId: payload.semesterId,
          monthId: payload.monthId,
          weekId: payload.weekId,
          paymentDate: new Date(payload.paymentDate),
          paymentDateHijri: payload.paymentDateHijri?.trim(),
          requiredAmountId: payload.requiredAmountId,
          receivedAmount: payload.receivedAmount ?? 0,
          isExempt: payload.isExempt ?? false,
          exemptionReasonId: payload.exemptionReasonId,
          exemptionAmount: payload.exemptionAmount ?? 0,
          exemptionAuthorityId: payload.exemptionAuthorityId,
          recipientEmployeeId: payload.recipientEmployeeId,
          payerName: payload.payerName?.trim(),
          receiptNumber: payload.receiptNumber?.trim(),
          notes: payload.notes?.trim(),
          createdByUserId: actorUserId,
          invoiceId: invoiceId ?? undefined,
          journalEntryId: journalEntryId ?? undefined,
        },
        include: communityContributionInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'COMMUNITY_CONTRIBUTION_CREATE',
        resource: 'community-contributions',
        resourceId: contribution.id.toString(),
        details: {
          enrollmentId: contribution.enrollmentId,
          monthId: contribution.monthId,
          amount: contribution.receivedAmount,
        },
      });

      return contribution;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'COMMUNITY_CONTRIBUTION_CREATE_FAILED',
        resource: 'community-contributions',
        status: AuditStatus.FAILURE,
        details: { reason: this.extractErrorMessage(error) },
      });
      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListCommunityContributionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.CommunityContributionWhereInput = {
      enrollmentId: query.enrollmentId,
      academicYearId: query.academicYearId,
      semesterId: query.semesterId,
      monthId: query.monthId,
      requiredAmountId: query.requiredAmountId,
      isExempt: query.isExempt,
      recipientEmployeeId: query.recipientEmployeeId,
      paymentDate:
        query.dateFrom || query.dateTo
          ? {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined,
            }
          : undefined,
      OR: query.search
        ? [
            { payerName: { contains: query.search } },
            { receiptNumber: { contains: query.search } },
            { notes: { contains: query.search } },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.communityContribution.count({ where }),
      this.prisma.communityContribution.findMany({
        where,
        include: communityContributionInclude,
        orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const contributionId = this.parseRequiredBigInt(id, 'id');

    const contribution = await this.prisma.communityContribution.findFirst({
      where: { id: contributionId },
      include: communityContributionInclude,
    });

    if (!contribution) {
      throw new NotFoundException('Community contribution not found');
    }

    return contribution;
  }

  async update(
    id: string,
    payload: UpdateCommunityContributionDto,
    actorUserId: string,
  ) {
    const contributionId = this.parseRequiredBigInt(id, 'id');
    await this.ensureExists(contributionId);

    const invoiceId =
      payload.invoiceId === undefined
        ? undefined
        : this.parseOptionalBigInt(payload.invoiceId, 'invoiceId');

    if (invoiceId) {
      await this.ensureInvoiceExists(invoiceId);
    }

    if (payload.journalEntryId) {
      await this.ensureJournalEntryExists(payload.journalEntryId);
    }

    try {
      const updated = await this.prisma.communityContribution.update({
        where: { id: contributionId },
        data: {
          enrollmentId: payload.enrollmentId,
          academicYearId: payload.academicYearId,
          semesterId: payload.semesterId,
          monthId: payload.monthId,
          weekId: payload.weekId,
          paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : undefined,
          paymentDateHijri: payload.paymentDateHijri?.trim(),
          requiredAmountId: payload.requiredAmountId,
          receivedAmount: payload.receivedAmount,
          isExempt: payload.isExempt,
          exemptionReasonId: payload.exemptionReasonId,
          exemptionAmount: payload.exemptionAmount,
          exemptionAuthorityId: payload.exemptionAuthorityId,
          recipientEmployeeId: payload.recipientEmployeeId,
          payerName: payload.payerName?.trim(),
          receiptNumber: payload.receiptNumber?.trim(),
          notes: payload.notes?.trim(),
          invoiceId: invoiceId === undefined ? undefined : invoiceId,
          journalEntryId: payload.journalEntryId,
        },
        include: communityContributionInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'COMMUNITY_CONTRIBUTION_UPDATE',
        resource: 'community-contributions',
        resourceId: contributionId.toString(),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    const contributionId = this.parseRequiredBigInt(id, 'id');
    await this.ensureExists(contributionId);

    await this.prisma.communityContribution.delete({
      where: { id: contributionId },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'COMMUNITY_CONTRIBUTION_DELETE',
      resource: 'community-contributions',
      resourceId: contributionId.toString(),
    });

    return { success: true, id };
  }

  private async ensureExists(id: bigint) {
    const contribution = await this.prisma.communityContribution.findFirst({
      where: { id },
      select: { id: true },
    });

    if (!contribution) {
      throw new NotFoundException('Community contribution not found');
    }
  }

  private async ensureContributionUnique(enrollmentId: string, monthId: string) {
    const existing = await this.prisma.communityContribution.findFirst({
      where: {
        enrollmentId,
        monthId,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Community contribution already exists');
    }
  }

  private async ensureInvoiceExists(id: bigint) {
    const invoice = await this.prisma.studentInvoice.findFirst({
      where: { id },
      select: { id: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
  }

  private async ensureJournalEntryExists(id: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }
  }

  private async createAutoBridgeArtifacts(
    payload: CreateCommunityContributionDto,
    actorUserId: string,
  ) {
    const bridgeContext = await this.resolveAutoBridgeContext(payload);

    if (bridgeContext.collectibleAmount <= 0 && bridgeContext.receivedAmount > 0) {
      throw new BadRequestException(
        'Cannot auto-bridge a positive receivedAmount when net contribution due is zero',
      );
    }

    if (bridgeContext.receivedAmount > bridgeContext.collectibleAmount) {
      throw new BadRequestException(
        'receivedAmount cannot exceed the net contribution amount when autoBridge is enabled',
      );
    }

    if (bridgeContext.collectibleAmount <= 0) {
      return {
        invoiceId: null,
        journalEntryId: null,
      };
    }

    const invoice = await this.studentInvoicesService.create(
      {
        enrollmentId: payload.enrollmentId,
        academicYearId: payload.academicYearId,
        invoiceDate: payload.paymentDate,
        dueDate: payload.paymentDate,
        currencyId: bridgeContext.currencyId ?? undefined,
        status: InvoiceStatus.ISSUED,
        notes: payload.notes?.trim() ?? 'Auto-bridged from community contribution',
        lines: [
          {
            feeType: FeeType.OTHER,
            descriptionAr: bridgeContext.descriptionAr,
            quantity: 1,
            unitPrice: bridgeContext.requiredAmount,
            discountAmount: bridgeContext.discountAmount,
            accountId: bridgeContext.revenueAccountId,
          },
        ],
        installments: [
          {
            installmentNumber: 1,
            dueDate: payload.paymentDate,
            amount: bridgeContext.collectibleAmount,
            notes: 'Auto-generated installment for community contribution bridge',
          },
        ],
      },
      actorUserId,
    );

    let journalEntryId: string | null = null;

    if (bridgeContext.receivedAmount > 0) {
      const installment = invoice.installments[0];
      const cashGatewayId = await this.resolveCashGatewayId();
      const transaction = await this.paymentTransactionsService.create(
        {
          gatewayId: cashGatewayId,
          enrollmentId: payload.enrollmentId,
          invoiceId: invoice.id.toString(),
          installmentId: installment?.id?.toString(),
          currencyId: bridgeContext.currencyId ?? undefined,
          amount: bridgeContext.receivedAmount,
          paymentMethod: PaymentMethod.CASH,
          status: PaymentTransactionStatus.COMPLETED,
          paidAt: new Date(payload.paymentDate).toISOString(),
          receiptNumber: payload.receiptNumber?.trim(),
          payerName: payload.payerName?.trim(),
          notes:
            payload.notes?.trim() ?? 'Auto-reconciled community contribution payment',
        },
        actorUserId,
      );

      const reconciled = await this.paymentTransactionsService.reconcile(
        transaction.id.toString(),
        actorUserId,
      );
      journalEntryId = reconciled.journalEntryId ?? null;
    }

    return {
      invoiceId: invoice.id,
      journalEntryId,
    };
  }

  private async resolveAutoBridgeContext(
    payload: CreateCommunityContributionDto,
  ) {
    const [requiredAmount, academicMonth, baseCurrency, categoryAccount] =
      await Promise.all([
        this.prisma.lookupContributionAmount.findFirst({
          where: {
            id: payload.requiredAmountId,
            isActive: true,
          },
          select: {
            id: true,
            nameAr: true,
            amountValue: true,
          },
        }),
        this.prisma.academicMonth.findFirst({
          where: {
            id: payload.monthId,
            academicYearId: payload.academicYearId,
            academicTermId: payload.semesterId,
            deletedAt: null,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
          },
        }),
        this.prisma.currency.findFirst({
          where: {
            deletedAt: null,
            isActive: true,
            isBase: true,
          },
          select: {
            id: true,
          },
          orderBy: { id: 'asc' },
        }),
        this.prisma.financialCategory.findFirst({
          where: {
            categoryType: FinancialCategoryType.REVENUE,
            nameAr: {
              contains: 'المساهمة المجتمعية',
            },
            isActive: true,
          },
          select: {
            coaAccountId: true,
          },
        }),
      ]);

    if (!requiredAmount) {
      throw new NotFoundException('Contribution amount configuration not found');
    }

    if (!academicMonth) {
      throw new NotFoundException('Academic month not found for the provided term/year');
    }

    const fallbackRevenueAccount = await this.prisma.chartOfAccount.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { nameEn: COMMUNITY_REVENUE_ACCOUNT_NAME_EN },
          { nameAr: COMMUNITY_REVENUE_ACCOUNT_NAME_AR },
        ],
      },
      select: {
        id: true,
      },
    });

    const revenueAccountId =
      categoryAccount?.coaAccountId ?? fallbackRevenueAccount?.id ?? null;

    if (!revenueAccountId) {
      throw new NotFoundException(
        'Community contribution revenue account is not configured',
      );
    }

    const requiredValue = Number(requiredAmount.amountValue);
    const discountAmount = Math.max(0, Number(payload.exemptionAmount ?? 0));
    const collectibleAmount = Math.max(0, requiredValue - discountAmount);
    const receivedAmount = Math.max(0, Number(payload.receivedAmount ?? 0));

    return {
      requiredAmount: requiredValue,
      discountAmount,
      collectibleAmount,
      receivedAmount,
      revenueAccountId,
      currencyId: baseCurrency?.id ?? null,
      descriptionAr: `المساهمة المجتمعية - ${academicMonth.name}`.slice(0, 200),
    };
  }

  private async resolveCashGatewayId() {
    const gateway = await this.prisma.paymentGateway.findFirst({
      where: {
        isActive: true,
        OR: [
          { nameEn: CASH_GATEWAY_NAME_EN },
          { nameAr: CASH_GATEWAY_NAME_AR },
        ],
      },
      select: {
        id: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    if (!gateway) {
      throw new NotFoundException('Cash payment gateway is not configured');
    }

    return gateway.id;
  }

  private parseOptionalBigInt(value?: string, fieldName = 'id'): bigint | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (!/^\d+$/.test(value)) {
      throw new NotFoundException(`${fieldName} must be a numeric string`);
    }

    try {
      return BigInt(value);
    } catch {
      throw new NotFoundException(`${fieldName} is invalid`);
    }
  }

  private parseRequiredBigInt(value: string, fieldName = 'id'): bigint {
    const parsed = this.parseOptionalBigInt(value, fieldName);

    if (parsed === null) {
      throw new NotFoundException(`${fieldName} is required`);
    }

    return parsed;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Community contribution already exists');
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
