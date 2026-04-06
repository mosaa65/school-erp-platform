import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreatePaymentGatewayDto } from './dto/create-payment-gateway.dto';
import { ListPaymentGatewaysDto } from './dto/list-payment-gateways.dto';
import { UpdatePaymentGatewayDto } from './dto/update-payment-gateway.dto';

const paymentGatewayInclude: Prisma.PaymentGatewayInclude = {
  settlementAccount: {
    select: {
      id: true,
      nameAr: true,
    },
  },
};

@Injectable()
export class PaymentGatewaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreatePaymentGatewayDto, actorUserId: string) {
    const nameAr = this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const nameEn = this.normalizeRequiredText(payload.nameEn, 'nameEn');
    const apiEndpoint =
      payload.apiEndpoint === undefined
        ? undefined
        : this.normalizeRequiredText(payload.apiEndpoint, 'apiEndpoint');
    const merchantId =
      payload.merchantId === undefined
        ? undefined
        : this.normalizeRequiredText(payload.merchantId, 'merchantId');

    try {
      const gateway = await this.prisma.paymentGateway.create({
        data: {
          nameAr,
          nameEn,
          gatewayType: payload.gatewayType,
          apiEndpoint,
          merchantId,
          settlementAccountId: payload.settlementAccountId,
          isActive: payload.isActive ?? true,
        } as Prisma.PaymentGatewayUncheckedCreateInput,
        include: paymentGatewayInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'PAYMENT_GATEWAY_CREATE',
        resource: 'payment-gateways',
        resourceId: String(gateway.id),
        details: {
          nameAr: gateway.nameAr,
          gatewayType: gateway.gatewayType,
        },
      });

      return gateway;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'PAYMENT_GATEWAY_CREATE_FAILED',
        resource: 'payment-gateways',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListPaymentGatewaysDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PaymentGatewayWhereInput = {
      isActive: query.isActive,
      gatewayType: query.gatewayType,
      OR: query.search
        ? [
            {
              nameAr: {
                contains: query.search,
              },
            },
            {
              nameEn: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.paymentGateway.count({ where }),
      this.prisma.paymentGateway.findMany({
        where,
        include: paymentGatewayInclude,
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
    const gateway = await this.prisma.paymentGateway.findFirst({
      where: {
        id,
      },
      include: paymentGatewayInclude,
    });

    if (!gateway) {
      throw new NotFoundException('Payment gateway not found');
    }

    return gateway;
  }

  async update(
    id: number,
    payload: UpdatePaymentGatewayDto,
    actorUserId: string,
  ) {
    await this.ensureGatewayExists(id);
    const nameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const nameEn =
      payload.nameEn === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameEn, 'nameEn');
    const apiEndpoint =
      payload.apiEndpoint === undefined
        ? undefined
        : this.normalizeRequiredText(payload.apiEndpoint, 'apiEndpoint');
    const merchantId =
      payload.merchantId === undefined
        ? undefined
        : this.normalizeRequiredText(payload.merchantId, 'merchantId');

    try {
      const updated = await this.prisma.paymentGateway.update({
        where: { id },
        data: {
          nameAr,
          nameEn,
          gatewayType: payload.gatewayType,
          apiEndpoint,
          merchantId,
          settlementAccountId: payload.settlementAccountId,
          isActive: payload.isActive,
        },
        include: paymentGatewayInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'PAYMENT_GATEWAY_UPDATE',
        resource: 'payment-gateways',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureGatewayExists(id);

    await this.prisma.paymentGateway.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'PAYMENT_GATEWAY_DELETE',
      resource: 'payment-gateways',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureGatewayExists(id: number) {
    const gateway = await this.prisma.paymentGateway.findFirst({
      where: {
        id,
      },
      select: { id: true },
    });

    if (!gateway) {
      throw new NotFoundException('Payment gateway not found');
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
      throw new ConflictException('Payment gateway already exists');
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
