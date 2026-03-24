import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
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

@Injectable()
export class CommunityContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateCommunityContributionDto, actorUserId: string) {
    const invoiceId = this.parseOptionalBigInt(payload.invoiceId, 'invoiceId');

    if (invoiceId) {
      await this.ensureInvoiceExists(invoiceId);
    }

    if (payload.journalEntryId) {
      await this.ensureJournalEntryExists(payload.journalEntryId);
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
          journalEntryId: payload.journalEntryId,
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
