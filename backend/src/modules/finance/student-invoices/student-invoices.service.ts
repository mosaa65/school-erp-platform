import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  DocumentType,
  InstallmentStatus,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';
import {
  buildHybridBranchClause,
  combineWhereClauses,
} from '../utils/hybrid-branch-scope';
import {
  CreateStudentInvoiceDto,
  InvoiceInstallmentInputDto,
  InvoiceLineInputDto,
} from './dto/create-student-invoice.dto';
import { ListStudentInvoicesDto } from './dto/list-student-invoices.dto';
import { UpdateStudentInvoiceDto } from './dto/update-student-invoice.dto';

const invoiceSummaryInclude: Prisma.StudentInvoiceInclude = {
  enrollment: {
    select: {
      id: true,
      studentId: true,
      sectionId: true,
      student: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  },
  academicYear: {
    select: {
      id: true,
      name: true,
    },
  },
  branch: {
    select: {
      id: true,
      nameAr: true,
    },
  },
  currency: {
    select: {
      id: true,
      code: true,
      nameAr: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      email: true,
    },
  },
};

const invoiceDetailInclude: Prisma.StudentInvoiceInclude = {
  ...invoiceSummaryInclude,
  lines: {
    orderBy: { id: 'asc' },
    include: {
      taxCode: {
        select: {
          id: true,
          taxCode: true,
          rate: true,
          taxType: true,
        },
      },
      discountRule: {
        select: {
          id: true,
          nameAr: true,
          discountType: true,
        },
      },
      discountGlAccount: {
        select: {
          id: true,
          accountCode: true,
          nameAr: true,
        },
      },
      account: {
        select: {
          id: true,
          accountCode: true,
          nameAr: true,
        },
      },
      feeStructure: {
        select: {
          id: true,
          nameAr: true,
          feeType: true,
        },
      },
    },
  },
  installments: {
    orderBy: { installmentNumber: 'asc' },
  },
};

@Injectable()
export class StudentInvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly documentSequencesService: DocumentSequencesService,
  ) {}

  async create(payload: CreateStudentInvoiceDto, actorUserId: string) {
    const invoiceDate = new Date(payload.invoiceDate);
    const dueDate = new Date(payload.dueDate);
    const invoiceNumber =
      payload.invoiceNumber?.trim() ||
      (await this.documentSequencesService.reserveNextNumber(DocumentType.INVOICE, {
        branchId: payload.branchId ?? null,
        date: invoiceDate,
      }));

    if (dueDate < invoiceDate) {
      throw new BadRequestException('dueDate cannot be before invoiceDate');
    }

    if (!payload.lines || payload.lines.length === 0) {
      throw new BadRequestException('Invoice must include at least one line');
    }

    const lines = payload.lines.map((line) => this.normalizeLine(line));
    const totals = this.calculateTotals(lines);

    const installments = this.normalizeInstallments(
      payload.installments,
      totals.totalAmount,
      dueDate,
    );

    const status = payload.status ?? InvoiceStatus.DRAFT;

    try {
      const invoice = await this.prisma.studentInvoice.create({
        data: {
          invoiceNumber,
          enrollmentId: payload.enrollmentId,
          academicYearId: payload.academicYearId,
          branchId: payload.branchId,
          invoiceDate,
          dueDate,
          status,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          vatAmount: totals.vatAmount,
          totalAmount: totals.totalAmount,
          paidAmount: 0,
          currencyId: payload.currencyId,
          notes: payload.notes?.trim(),
          createdByUserId: actorUserId,
          lines: {
            create: lines.map((line) => ({
              feeStructureId: line.feeStructureId,
              descriptionAr: line.descriptionAr,
              feeType: line.feeType,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountAmount: line.discountAmount,
              discountRuleId: line.discountRuleId,
              discountGlAccountId: line.discountGlAccountId,
              taxCodeId: line.taxCodeId,
              vatRate: line.vatRate,
              vatAmount: line.vatAmount,
              lineTotal: line.lineTotal,
              accountId: line.accountId,
            })),
          },
          installments: {
            create: installments.map((installment) => ({
              dueDate: installment.dueDate,
              amount: installment.amount,
              installmentNumber: installment.installmentNumber,
              status: installment.status,
              paidAmount: 0,
              paymentDate: installment.paymentDate,
              lateFee: installment.lateFee,
              notes: installment.notes,
            })),
          },
        },
        include: invoiceDetailInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_INVOICE_CREATE',
        resource: 'student-invoices',
        resourceId: invoice.id.toString(),
        details: {
          invoiceNumber: invoice.invoiceNumber,
          enrollmentId: invoice.enrollmentId,
          totalAmount: invoice.totalAmount,
        },
      });

      return invoice;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_INVOICE_CREATE_FAILED',
        resource: 'student-invoices',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListStudentInvoicesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const baseWhere: Prisma.StudentInvoiceWhereInput = {
      enrollmentId: query.enrollmentId,
      academicYearId: query.academicYearId,
      currencyId: query.currencyId,
      status: query.status,
    };
    const branchWhere = buildHybridBranchClause(query.branchId) as
      | Prisma.StudentInvoiceWhereInput
      | undefined;
    const searchWhere: Prisma.StudentInvoiceWhereInput | undefined = query.search
      ? {
          OR: [
            {
              invoiceNumber: {
                contains: query.search,
              },
            },
          ],
        }
      : undefined;
    const where = combineWhereClauses<Prisma.StudentInvoiceWhereInput>(
      baseWhere,
      branchWhere,
      searchWhere,
    );

    const [total, items] = await this.prisma.$transaction([
      this.prisma.studentInvoice.count({ where }),
      this.prisma.studentInvoice.findMany({
        where,
        include: invoiceSummaryInclude,
        orderBy: [{ invoiceDate: 'desc' }],
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
    const invoiceId = this.parseRequiredBigInt(id, 'id');
    const invoice = await this.prisma.studentInvoice.findFirst({
      where: {
        id: invoiceId,
      },
      include: invoiceDetailInclude,
    });

    if (!invoice) {
      throw new NotFoundException('Student invoice not found');
    }

    return invoice;
  }

  async update(
    id: string,
    payload: UpdateStudentInvoiceDto,
    actorUserId: string,
  ) {
    const invoiceId = this.parseRequiredBigInt(id, 'id');
    await this.ensureInvoiceExists(invoiceId);

    const invoiceDate = payload.invoiceDate ? new Date(payload.invoiceDate) : undefined;
    const dueDate = payload.dueDate ? new Date(payload.dueDate) : undefined;

    if (invoiceDate && dueDate && dueDate < invoiceDate) {
      throw new BadRequestException('dueDate cannot be before invoiceDate');
    }

    try {
      const updated = await this.prisma.studentInvoice.update({
        where: { id: invoiceId },
        data: {
          invoiceDate,
          dueDate,
          status: payload.status,
          notes: payload.notes?.trim(),
          branchId: payload.branchId,
          currencyId: payload.currencyId,
        },
        include: invoiceDetailInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_INVOICE_UPDATE',
        resource: 'student-invoices',
        resourceId: invoiceId.toString(),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    const invoiceId = this.parseRequiredBigInt(id, 'id');
    await this.ensureInvoiceExists(invoiceId);

    await this.prisma.studentInvoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.CANCELLED,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'STUDENT_INVOICE_DELETE',
      resource: 'student-invoices',
      resourceId: invoiceId.toString(),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureInvoiceExists(id: bigint) {
    const invoice = await this.prisma.studentInvoice.findFirst({
      where: {
        id,
      },
      select: { id: true },
    });

    if (!invoice) {
      throw new NotFoundException('Student invoice not found');
    }
  }

  private normalizeLine(line: InvoiceLineInputDto) {
    const quantity = line.quantity ?? 1;
    const unitPrice = line.unitPrice;
    const baseAmount = this.roundMoney(quantity * unitPrice);
    const discountAmount = this.roundMoney(line.discountAmount ?? 0);
    const descriptionAr = line.descriptionAr.trim();

    if (!descriptionAr) {
      throw new BadRequestException('descriptionAr cannot be empty');
    }

    if (discountAmount > baseAmount) {
      throw new BadRequestException('discountAmount cannot exceed amount');
    }

    const vatRate = this.roundMoney(line.vatRate ?? 0);
    const taxableBase = this.roundMoney(baseAmount - discountAmount);
    const vatAmount =
      line.vatAmount !== undefined
        ? this.roundMoney(line.vatAmount)
        : this.roundMoney((taxableBase * vatRate) / 100);
    const lineTotal = this.roundMoney(taxableBase + vatAmount);

    return {
      feeStructureId: line.feeStructureId,
      feeType: line.feeType,
      descriptionAr,
      quantity,
      unitPrice: this.roundMoney(unitPrice),
      discountAmount,
      discountRuleId: line.discountRuleId,
      discountGlAccountId: line.discountGlAccountId,
      taxCodeId: line.taxCodeId,
      vatRate,
      vatAmount,
      lineTotal,
      accountId: line.accountId,
    };
  }

  private calculateTotals(lines: ReturnType<StudentInvoicesService['normalizeLine']>[]) {
    const subtotal = this.roundMoney(
      lines.reduce((sum, line) => sum + line.quantity * Number(line.unitPrice), 0),
    );
    const discountAmount = this.roundMoney(
      lines.reduce((sum, line) => sum + line.discountAmount, 0),
    );
    const vatAmount = this.roundMoney(
      lines.reduce((sum, line) => sum + line.vatAmount, 0),
    );
    const totalAmount = this.roundMoney(subtotal - discountAmount + vatAmount);

    return {
      subtotal,
      discountAmount,
      vatAmount,
      totalAmount,
    };
  }

  private normalizeInstallments(
    installments: InvoiceInstallmentInputDto[] | undefined,
    totalAmount: number,
    dueDate: Date,
  ) {
    if (!installments || installments.length === 0) {
      return [
        {
          dueDate,
          amount: totalAmount,
          installmentNumber: 1,
          status: InstallmentStatus.PENDING,
          paymentDate: undefined,
          lateFee: 0,
          notes: undefined,
        },
      ];
    }

    const seen = new Set<number>();
    const normalized = installments.map((installment) => {
      if (seen.has(installment.installmentNumber)) {
        throw new BadRequestException('installmentNumber must be unique');
      }
      seen.add(installment.installmentNumber);

      return {
        dueDate: new Date(installment.dueDate),
        amount: this.roundMoney(installment.amount),
        installmentNumber: installment.installmentNumber,
        status: InstallmentStatus.PENDING,
        paymentDate: installment.paymentDate ? new Date(installment.paymentDate) : undefined,
        lateFee: installment.lateFee ?? 0,
        notes: installment.notes?.trim(),
      };
    });

    const sumInstallments = this.roundMoney(
      normalized.reduce((sum, installment) => sum + installment.amount, 0),
    );

    if (Math.abs(sumInstallments - totalAmount) > 0.01) {
      throw new BadRequestException('Installment total must match invoice total');
    }

    return normalized;
  }

  private parseOptionalBigInt(value?: string, fieldName = 'id'): bigint | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(`${fieldName} must be a numeric string`);
    }

    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException(`${fieldName} is invalid`);
    }
  }

  private parseRequiredBigInt(value: string, fieldName = 'id'): bigint {
    const parsed = this.parseOptionalBigInt(value, fieldName);

    if (parsed === null) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return parsed;
  }

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Student invoice already exists');
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
