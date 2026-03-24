import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateFinancialFundDto } from './dto/create-financial-fund.dto';
import { ListFinancialFundsDto } from './dto/list-financial-funds.dto';
import { UpdateFinancialFundDto } from './dto/update-financial-fund.dto';

const financialFundInclude: Prisma.FinancialFundInclude = {
  coaAccount: {
    select: {
      id: true,
      accountCode: true,
      nameAr: true,
    },
  },
};

@Injectable()
export class FinancialFundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateFinancialFundDto, actorUserId: string) {
    const nameAr = this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const code = payload.code?.trim();

    if (code !== undefined && !code) {
      throw new BadRequestException('code cannot be empty');
    }

    if (payload.coaAccountId) {
      await this.findPostingAccountById(payload.coaAccountId);
    }

    try {
      const fund = await this.prisma.financialFund.create({
        data: {
          nameAr,
          code,
          fundType: payload.fundType,
          coaAccountId: payload.coaAccountId,
          isActive: payload.isActive ?? true,
        },
        include: financialFundInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'FINANCIAL_FUND_CREATE',
        resource: 'financial-funds',
        resourceId: String(fund.id),
        details: { nameAr: fund.nameAr, fundType: fund.fundType },
      });

      return fund;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'FINANCIAL_FUND_CREATE_FAILED',
        resource: 'financial-funds',
        status: AuditStatus.FAILURE,
        details: { reason: this.extractErrorMessage(error) },
      });
      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListFinancialFundsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.FinancialFundWhereInput = {
      isActive: query.isActive,
      fundType: query.fundType,
      coaAccountId: query.coaAccountId,
      OR: query.search
        ? [
            { nameAr: { contains: query.search } },
            { code: { contains: query.search } },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.financialFund.count({ where }),
      this.prisma.financialFund.findMany({
        where,
        include: financialFundInclude,
        orderBy: [{ nameAr: 'asc' }],
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

  async findOne(id: number) {
    const fund = await this.prisma.financialFund.findFirst({
      where: { id },
      include: financialFundInclude,
    });

    if (!fund) {
      throw new NotFoundException('Financial fund not found');
    }

    return fund;
  }

  async update(id: number, payload: UpdateFinancialFundDto, actorUserId: string) {
    await this.ensureExists(id);

    const nameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');

    const code = payload.code?.trim();
    if (payload.code !== undefined && !code) {
      throw new BadRequestException('code cannot be empty');
    }

    if (payload.coaAccountId) {
      await this.findPostingAccountById(payload.coaAccountId);
    }

    try {
      const updated = await this.prisma.financialFund.update({
        where: { id },
        data: {
          nameAr,
          code,
          fundType: payload.fundType,
          coaAccountId: payload.coaAccountId,
          isActive: payload.isActive,
        },
        include: financialFundInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'FINANCIAL_FUND_UPDATE',
        resource: 'financial-funds',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureExists(id);

    await this.prisma.financialFund.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'FINANCIAL_FUND_DELETE',
      resource: 'financial-funds',
      resourceId: String(id),
    });

    return { success: true, id };
  }

  private async ensureExists(id: number) {
    const fund = await this.prisma.financialFund.findFirst({
      where: { id },
      select: { id: true },
    });

    if (!fund) {
      throw new NotFoundException('Financial fund not found');
    }
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }
    return normalized;
  }

  private async findPostingAccountById(accountId: number) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: {
        id: accountId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        isHeader: true,
      },
    });

    if (!account) {
      throw new NotFoundException(`Posting account ${accountId} was not found`);
    }

    if (account.isHeader) {
      throw new BadRequestException(
        `Posting account ${accountId} cannot be a header account`,
      );
    }

    return account;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Financial fund already exists');
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
