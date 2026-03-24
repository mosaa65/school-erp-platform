import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditStatus, InstallmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateInvoiceInstallmentDto } from './dto/create-invoice-installment.dto';
import { ListInvoiceInstallmentsDto } from './dto/list-invoice-installments.dto';
import { UpdateInvoiceInstallmentDto } from './dto/update-invoice-installment.dto';

const installmentInclude: Prisma.InvoiceInstallmentInclude = {
  invoice: {
    select: {
      id: true,
      invoiceNumber: true,
      enrollmentId: true,
      totalAmount: true,
      status: true,
    },
  },
};

@Injectable()
export class InvoiceInstallmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateInvoiceInstallmentDto, actorUserId: string) {
    const invoiceId = this.parseRequiredBigInt(payload.invoiceId, 'invoiceId');
    try {
      const installment = await this.prisma.invoiceInstallment.create({
        data: {
          invoiceId,
          dueDate: new Date(payload.dueDate),
          amount: payload.amount,
          paidAmount: payload.paidAmount ?? 0,
          status: payload.status ?? InstallmentStatus.PENDING,
          installmentNumber: payload.installmentNumber,
          paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : undefined,
          lateFee: payload.lateFee ?? 0,
          notes: payload.notes?.trim(),
        },
        include: installmentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'INVOICE_INSTALLMENT_CREATE',
        resource: 'invoice-installments',
        resourceId: installment.id.toString(),
        details: {
          invoiceId: installment.invoiceId.toString(),
          installmentNumber: installment.installmentNumber,
          amount: installment.amount,
        },
      });

      return installment;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'INVOICE_INSTALLMENT_CREATE_FAILED',
        resource: 'invoice-installments',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListInvoiceInstallmentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.InvoiceInstallmentWhereInput = {
      invoiceId: query.invoiceId
        ? this.parseRequiredBigInt(query.invoiceId, 'invoiceId')
        : undefined,
      status: query.status,
      dueDate: query.dueDateFrom || query.dueDateTo
        ? {
            gte: query.dueDateFrom ? new Date(query.dueDateFrom) : undefined,
            lte: query.dueDateTo ? new Date(query.dueDateTo) : undefined,
          }
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.invoiceInstallment.count({ where }),
      this.prisma.invoiceInstallment.findMany({
        where,
        include: installmentInclude,
        orderBy: [{ dueDate: 'asc' }],
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
    const installmentId = this.parseRequiredBigInt(id, 'id');
    const installment = await this.prisma.invoiceInstallment.findFirst({
      where: {
        id: installmentId,
      },
      include: installmentInclude,
    });

    if (!installment) {
      throw new NotFoundException('Invoice installment not found');
    }

    return installment;
  }

  async update(
    id: string,
    payload: UpdateInvoiceInstallmentDto,
    actorUserId: string,
  ) {
    const installmentId = this.parseRequiredBigInt(id, 'id');
    await this.ensureInstallmentExists(installmentId);

    const dueDate = payload.dueDate ? new Date(payload.dueDate) : undefined;
    const invoiceId = payload.invoiceId
      ? this.parseRequiredBigInt(payload.invoiceId, 'invoiceId')
      : undefined;

    try {
      const updated = await this.prisma.invoiceInstallment.update({
        where: { id: installmentId },
        data: {
          invoiceId,
          dueDate,
          amount: payload.amount,
          paidAmount: payload.paidAmount,
          status: payload.status,
          installmentNumber: payload.installmentNumber,
          paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : undefined,
          lateFee: payload.lateFee,
          notes: payload.notes?.trim(),
        },
        include: installmentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'INVOICE_INSTALLMENT_UPDATE',
        resource: 'invoice-installments',
        resourceId: installmentId.toString(),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    const installmentId = this.parseRequiredBigInt(id, 'id');
    await this.ensureInstallmentExists(installmentId);

    await this.prisma.invoiceInstallment.delete({
      where: { id: installmentId },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'INVOICE_INSTALLMENT_DELETE',
      resource: 'invoice-installments',
      resourceId: installmentId.toString(),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureInstallmentExists(id: bigint) {
    const installment = await this.prisma.invoiceInstallment.findFirst({
      where: {
        id,
      },
      select: { id: true },
    });

    if (!installment) {
      throw new NotFoundException('Invoice installment not found');
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Invoice installment already exists');
    }

    throw error;
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

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
