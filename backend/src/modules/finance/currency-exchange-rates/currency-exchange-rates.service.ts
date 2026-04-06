import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateCurrencyExchangeRateDto } from './dto/create-currency-exchange-rate.dto';
import { ListCurrencyExchangeRatesDto } from './dto/list-currency-exchange-rates.dto';
import { UpdateCurrencyExchangeRateDto } from './dto/update-currency-exchange-rate.dto';

const exchangeRateInclude: Prisma.CurrencyExchangeRateInclude = {
  fromCurrency: {
    select: {
      id: true,
      nameAr: true,
      symbol: true,
    },
  },
  toCurrency: {
    select: {
      id: true,
      nameAr: true,
      symbol: true,
    },
  },
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
export class CurrencyExchangeRatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateCurrencyExchangeRateDto, actorUserId: string) {
    this.assertDistinctCurrencies(payload.fromCurrencyId, payload.toCurrencyId);

    await this.ensureCurrencyExists(payload.fromCurrencyId);
    await this.ensureCurrencyExists(payload.toCurrencyId);

    const effectiveDate = new Date(payload.effectiveDate);

    try {
      const rate = await this.prisma.currencyExchangeRate.create({
        data: {
          fromCurrencyId: payload.fromCurrencyId,
          toCurrencyId: payload.toCurrencyId,
          rate: payload.rate,
          effectiveDate,
          source: payload.source?.trim(),
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: exchangeRateInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'CURRENCY_EXCHANGE_RATE_CREATE',
        resource: 'currency-exchange-rates',
        resourceId: String(rate.id),
        details: {
          fromCurrencyId: rate.fromCurrencyId,
          toCurrencyId: rate.toCurrencyId,
          effectiveDate: rate.effectiveDate,
        },
      });

      return rate;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'CURRENCY_EXCHANGE_RATE_CREATE_FAILED',
        resource: 'currency-exchange-rates',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListCurrencyExchangeRatesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.CurrencyExchangeRateWhereInput = {
      deletedAt: null,
      isActive: query.isActive,
      fromCurrencyId: query.fromCurrencyId,
      toCurrencyId: query.toCurrencyId,
      effectiveDate: query.dateFrom || query.dateTo
        ? {
            gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
            lte: query.dateTo ? new Date(query.dateTo) : undefined,
          }
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.currencyExchangeRate.count({ where }),
      this.prisma.currencyExchangeRate.findMany({
        where,
        include: exchangeRateInclude,
        orderBy: [{ effectiveDate: 'desc' }],
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
    const rate = await this.prisma.currencyExchangeRate.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: exchangeRateInclude,
    });

    if (!rate) {
      throw new NotFoundException('Currency exchange rate not found');
    }

    return rate;
  }

  async update(
    id: number,
    payload: UpdateCurrencyExchangeRateDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureExchangeRateExists(id);

    const fromCurrencyId = payload.fromCurrencyId ?? existing.fromCurrencyId;
    const toCurrencyId = payload.toCurrencyId ?? existing.toCurrencyId;

    this.assertDistinctCurrencies(fromCurrencyId, toCurrencyId);

    if (payload.fromCurrencyId) {
      await this.ensureCurrencyExists(payload.fromCurrencyId);
    }

    if (payload.toCurrencyId) {
      await this.ensureCurrencyExists(payload.toCurrencyId);
    }

    const effectiveDate =
      payload.effectiveDate === undefined
        ? undefined
        : new Date(payload.effectiveDate);

    try {
      const updated = await this.prisma.currencyExchangeRate.update({
        where: { id },
        data: {
          fromCurrencyId: payload.fromCurrencyId,
          toCurrencyId: payload.toCurrencyId,
          rate: payload.rate,
          effectiveDate,
          source: payload.source?.trim(),
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: exchangeRateInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'CURRENCY_EXCHANGE_RATE_UPDATE',
        resource: 'currency-exchange-rates',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureExchangeRateExists(id);

    await this.prisma.currencyExchangeRate.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'CURRENCY_EXCHANGE_RATE_DELETE',
      resource: 'currency-exchange-rates',
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

  private async ensureExchangeRateExists(id: number) {
    const rate = await this.prisma.currencyExchangeRate.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: { id: true, fromCurrencyId: true, toCurrencyId: true },
    });

    if (!rate) {
      throw new NotFoundException('Currency exchange rate not found');
    }

    return rate;
  }

  private assertDistinctCurrencies(fromCurrencyId: number, toCurrencyId: number) {
    if (fromCurrencyId === toCurrencyId) {
      throw new BadRequestException('Currencies must be different');
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Exchange rate already exists');
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
