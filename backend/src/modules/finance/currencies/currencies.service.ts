import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { ListCurrenciesDto } from './dto/list-currencies.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';

const currencyInclude: Prisma.CurrencyInclude = {
  createdBy: {
    select: {
      id: true,
      email: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      email: true,
    },
  },
};

@Injectable()
export class CurrenciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateCurrencyDto, actorUserId: string) {
    const nameAr = this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const symbol = this.normalizeRequiredText(payload.symbol, 'symbol');

    const isBase = payload.isBase ?? false;

    try {
      const results = await this.prisma.$transaction([
        ...(isBase
          ? [
              this.prisma.currency.updateMany({
                where: { isBase: true },
                data: { isBase: false },
              }),
            ]
          : []),
        this.prisma.currency.create({
          data: {
            nameAr,
            symbol,
            decimalPlaces: payload.decimalPlaces ?? 2,
            isBase,
            isActive: payload.isActive ?? true,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
          include: currencyInclude,
        }),
      ]);
      const currency = results[results.length - 1] as Prisma.CurrencyGetPayload<{
        include: typeof currencyInclude;
      }>;

      await this.auditLogsService.record({
        actorUserId,
        action: 'CURRENCY_CREATE',
        resource: 'currencies',
        resourceId: String(currency.id),
        details: {
          nameAr: currency.nameAr,
          isBase: currency.isBase,
        },
      });

      return currency;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'CURRENCY_CREATE_FAILED',
        resource: 'currencies',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListCurrenciesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.CurrencyWhereInput = {
      deletedAt: null,
      isActive: query.isActive,
      isBase: query.isBase,
      OR: query.search
        ? [
            {
              nameAr: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.currency.count({ where }),
      this.prisma.currency.findMany({
        where,
        include: currencyInclude,
        orderBy: [{ nameAr: 'asc' }, { id: 'asc' }],
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
    const currency = await this.prisma.currency.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: currencyInclude,
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    return currency;
  }

  async update(id: number, payload: UpdateCurrencyDto, actorUserId: string) {
    await this.ensureCurrencyExists(id);

    const nameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const symbol =
      payload.symbol === undefined
        ? undefined
        : this.normalizeRequiredText(payload.symbol, 'symbol');

    try {
      const results = await this.prisma.$transaction([
        ...(payload.isBase
          ? [
              this.prisma.currency.updateMany({
                where: { id: { not: id } },
                data: { isBase: false },
              }),
            ]
          : []),
        this.prisma.currency.update({
        where: { id },
        data: {
          nameAr,
          symbol,
            decimalPlaces: payload.decimalPlaces,
            isBase: payload.isBase,
            isActive: payload.isActive,
            updatedById: actorUserId,
          },
          include: currencyInclude,
        }),
      ]);
      const currency = results[results.length - 1] as Prisma.CurrencyGetPayload<{
        include: typeof currencyInclude;
      }>;

      await this.auditLogsService.record({
        actorUserId,
        action: 'CURRENCY_UPDATE',
        resource: 'currencies',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return currency;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureCurrencyExists(id);

    await this.prisma.currency.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'CURRENCY_DELETE',
      resource: 'currencies',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureCurrencyExists(id: number) {
    const currency = await this.prisma.currency.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }

    return normalized;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Currency already exists');
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
