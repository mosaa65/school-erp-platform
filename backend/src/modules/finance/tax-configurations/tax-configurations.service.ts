import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateTaxConfigurationDto } from './dto/create-tax-configuration.dto';
import { ListTaxConfigurationsDto } from './dto/list-tax-configurations.dto';
import { UpdateTaxConfigurationDto } from './dto/update-tax-configuration.dto';

const taxCodeInclude: Prisma.TaxCodeInclude = {
  outputGlAccount: {
    select: {
      id: true,
      nameAr: true,
    },
  },
  inputGlAccount: {
    select: {
      id: true,
      nameAr: true,
    },
  },
};

@Injectable()
export class TaxConfigurationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateTaxConfigurationDto, actorUserId: string) {
    const taxNameAr = this.normalizeRequiredText(payload.taxNameAr, 'taxNameAr');

    this.assertRate(payload.rate);

    try {
      const taxCode = await this.prisma.taxCode.create({
        data: {
          taxNameAr,
          taxNameEn: payload.taxNameEn?.trim(),
          rate: payload.rate,
          taxType: payload.taxType,
          isInclusive: payload.isInclusive ?? false,
          outputGlAccountId: payload.outputGlAccountId,
          inputGlAccountId: payload.inputGlAccountId,
          effectiveFrom: new Date(payload.effectiveFrom),
          effectiveTo: payload.effectiveTo ? new Date(payload.effectiveTo) : undefined,
          isActive: payload.isActive ?? true,
        } as Prisma.TaxCodeUncheckedCreateInput,
        include: taxCodeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'TAX_CODE_CREATE',
        resource: 'tax-configurations',
        resourceId: String(taxCode.id),
        details: {
          nameAr: taxCode.taxNameAr,
          rate: taxCode.rate,
        },
      });

      return taxCode;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'TAX_CODE_CREATE_FAILED',
        resource: 'tax-configurations',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListTaxConfigurationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.TaxCodeWhereInput = {
      isActive: query.isActive,
      taxType: query.taxType ?? undefined,
      OR: query.search
        ? [
            {
              taxNameAr: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.taxCode.count({ where }),
      this.prisma.taxCode.findMany({
        where,
        include: taxCodeInclude,
        orderBy: [{ taxNameAr: 'asc' }, { id: 'asc' }],
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
    const taxCode = await this.prisma.taxCode.findFirst({
      where: {
        id,
      },
      include: taxCodeInclude,
    });

    if (!taxCode) {
      throw new NotFoundException('Tax code not found');
    }

    return taxCode;
  }

  async update(
    id: number,
    payload: UpdateTaxConfigurationDto,
    actorUserId: string,
  ) {
    await this.ensureTaxCodeExists(id);

    const taxNameAr =
      payload.taxNameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.taxNameAr, 'taxNameAr');

    if (payload.rate !== undefined) {
      this.assertRate(payload.rate);
    }

    try {
      const updated = await this.prisma.taxCode.update({
        where: { id },
        data: {
          taxNameAr,
          taxNameEn: payload.taxNameEn?.trim(),
          rate: payload.rate,
          taxType: payload.taxType,
          isInclusive: payload.isInclusive,
          outputGlAccountId: payload.outputGlAccountId,
          inputGlAccountId: payload.inputGlAccountId,
          effectiveFrom: payload.effectiveFrom ? new Date(payload.effectiveFrom) : undefined,
          effectiveTo: payload.effectiveTo ? new Date(payload.effectiveTo) : undefined,
          isActive: payload.isActive,
        },
        include: taxCodeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'TAX_CODE_UPDATE',
        resource: 'tax-configurations',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureTaxCodeExists(id);

    await this.prisma.taxCode.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'TAX_CODE_DELETE',
      resource: 'tax-configurations',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureTaxCodeExists(id: number) {
    const taxCode = await this.prisma.taxCode.findFirst({
      where: {
        id,
      },
      select: { id: true },
    });

    if (!taxCode) {
      throw new NotFoundException('Tax code not found');
    }
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }

    return normalized;
  }

  private assertRate(rate: number) {
    if (rate < 0 || rate > 100) {
      throw new BadRequestException('rate must be between 0 and 100');
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Tax code already exists');
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
