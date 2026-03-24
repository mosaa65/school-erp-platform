import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  CreditDebitNoteReason,
  CreditDebitNoteType,
  DiscountCalculationMethod,
  DiscountType,
  DocumentType,
  InstallmentStatus,
  InvoiceStatus,
  StudentEnrollmentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreditDebitNotesService } from '../credit-debit-notes/credit-debit-notes.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';
import { ApplySiblingDiscountDto } from './dto/apply-sibling-discount.dto';
import { BulkGenerateInvoicesDto } from './dto/bulk-generate.dto';
import { ProcessWithdrawalDto } from './dto/process-withdrawal.dto';

@Injectable()
export class BillingEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly creditDebitNotesService: CreditDebitNotesService,
    private readonly documentSequencesService: DocumentSequencesService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // 1. توليد فواتير جماعية — Bulk Invoice Generation
  // ═══════════════════════════════════════════════════════════════

  async bulkGenerate(payload: BulkGenerateInvoicesDto, actorUserId: string) {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: payload.academicYearId },
      select: { id: true, name: true },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    // جلب هياكل الرسوم الفعالة للسنة الأكاديمية
    const feeStructures = await this.prisma.feeStructure.findMany({
      where: {
        academicYearId: payload.academicYearId,
        isActive: true,
        ...(payload.gradeLevelId ? { gradeLevelId: payload.gradeLevelId } : {}),
      },
    });

    if (feeStructures.length === 0) {
      throw new BadRequestException(
        'No active fee structures found for this academic year',
      );
    }

    // جلب الطلاب المسجلين (الذين ليس لديهم فاتورة لهذه السنة)
    const enrollmentWhere: Prisma.StudentEnrollmentWhereInput = {
      academicYearId: payload.academicYearId,
      isActive: true,
      deletedAt: null,
      ...(payload.gradeLevelId
        ? {
            section: {
              gradeLevel: {
                id: payload.gradeLevelId,
              },
            },
          }
        : {}),
      studentInvoices: {
        none: {
          academicYearId: payload.academicYearId,
          status: { notIn: [InvoiceStatus.CANCELLED] },
        },
      },
    };

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: enrollmentWhere,
      select: {
        id: true,
        studentId: true,
        sectionId: true,
        section: {
          select: {
            gradeLevelId: true,
          },
        },
        student: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (enrollments.length === 0) {
      return {
        message: 'No eligible students found for invoice generation',
        generated: 0,
        skipped: 0,
        invoices: [],
      };
    }

    const invoiceDate = payload.invoiceDate
      ? new Date(payload.invoiceDate)
      : new Date();
    const installmentCount = payload.installmentCount ?? 1;
    const baseCurrency = await this.findBaseCurrency();

    const generatedInvoices: {
      enrollmentId: string;
      studentName: string;
      invoiceNumber: string;
      totalAmount: number;
    }[] = [];
    const errors: { enrollmentId: string; error: string }[] = [];

    // حساب خصم الإخوة إذا طُلب
    let siblingDiscountsMap: Map<string, number> = new Map();
    if (payload.applySiblingDiscount) {
      siblingDiscountsMap = await this.calculateAllSiblingDiscounts(
        payload.academicYearId,
        enrollments.map((e) => e.studentId),
      );
    }

    for (const enrollment of enrollments) {
      try {
        // جلب هياكل الرسوم الخاصة بمستوى الصف
        const applicableFees = feeStructures.filter(
          (fs) =>
            !fs.gradeLevelId ||
            fs.gradeLevelId === enrollment.section?.gradeLevelId,
        );

        if (applicableFees.length === 0) continue;

        // حساب المبلغ الفرعي
        const subtotal = applicableFees.reduce(
          (sum, fs) => sum + Number(fs.amount),
          0,
        );

        // حساب الخصم
        const siblingDiscount = siblingDiscountsMap.get(enrollment.studentId) ?? 0;
        const discountAmount = Number((subtotal * siblingDiscount / 100).toFixed(2));

        // حساب الضريبة
        const vatTotal = applicableFees.reduce((sum, fs) => {
          const lineSubtotal = Number(fs.amount) - (Number(fs.amount) * siblingDiscount / 100);
          return sum + Number((lineSubtotal * Number(fs.vatRate) / 100).toFixed(2));
        }, 0);

        const totalAmount = Number((subtotal - discountAmount + vatTotal).toFixed(2));

        const dueDate = payload.dueDate
          ? new Date(payload.dueDate)
          : new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        const invoiceNumber =
          await this.documentSequencesService.reserveNextNumber(
            DocumentType.INVOICE,
            { date: invoiceDate },
          );

        // إنشاء الأقساط
        const installments: Prisma.InvoiceInstallmentCreateManyInvoiceInput[] = [];
        if (installmentCount > 1) {
          const installmentAmount = Number(
            (totalAmount / installmentCount).toFixed(2),
          );
          const remainder = Number(
            (totalAmount - installmentAmount * (installmentCount - 1)).toFixed(2),
          );

          for (let i = 1; i <= installmentCount; i++) {
            const installDueDate = new Date(invoiceDate);
            installDueDate.setMonth(installDueDate.getMonth() + i);
            installments.push({
              installmentNumber: i,
              dueDate: installDueDate,
              amount: i === installmentCount ? remainder : installmentAmount,
              status: InstallmentStatus.PENDING,
            });
          }
        } else {
          installments.push({
            installmentNumber: 1,
            dueDate,
            amount: totalAmount,
            status: InstallmentStatus.PENDING,
          });
        }

        // إنشاء الفاتورة with lines
        await this.prisma.studentInvoice.create({
          data: {
            invoiceNumber,
            enrollmentId: enrollment.id,
            academicYearId: payload.academicYearId,
            branchId: payload.branchId,
            invoiceDate,
            dueDate,
            subtotal,
            discountAmount,
            vatAmount: vatTotal,
            totalAmount,
            paidAmount: 0,
            currencyId: baseCurrency?.id,
            status: InvoiceStatus.ISSUED,
            createdByUserId: actorUserId,
            lines: {
              create: applicableFees.map((fs) => {
                const lineDiscount = Number((Number(fs.amount) * siblingDiscount / 100).toFixed(2));
                const lineSubtotal = Number(fs.amount) - lineDiscount;
                const lineVat = Number((lineSubtotal * Number(fs.vatRate) / 100).toFixed(2));
                return {
                  feeStructureId: fs.id,
                  descriptionAr: fs.nameAr,
                  feeType: fs.feeType,
                  quantity: 1,
                  unitPrice: Number(fs.amount),
                  discountAmount: lineDiscount,
                  vatRate: Number(fs.vatRate),
                  vatAmount: lineVat,
                  lineTotal: Number((lineSubtotal + lineVat).toFixed(2)),
                };
              }),
            },
            installments: {
              create: installments,
            },
          },
        });

        generatedInvoices.push({
          enrollmentId: enrollment.id,
          studentName: enrollment.student?.fullName ?? 'N/A',
          invoiceNumber,
          totalAmount,
        });
      } catch (error) {
        errors.push({
          enrollmentId: enrollment.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await this.auditLogsService.record({
      actorUserId,
      action: 'BULK_INVOICE_GENERATE',
      resource: 'billing-engine',
      details: {
        academicYearId: payload.academicYearId,
        generated: generatedInvoices.length,
        errors: errors.length,
      },
    });

    return {
      message: `Generated ${generatedInvoices.length} invoices`,
      generated: generatedInvoices.length,
      skipped: errors.length,
      invoices: generatedInvoices,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. تطبيق خصم الإخوة — Apply Sibling Discount
  // ═══════════════════════════════════════════════════════════════

  async applySiblingDiscount(
    payload: ApplySiblingDiscountDto,
    actorUserId: string,
  ) {
    // جلب أبناء ولي الأمر
    const siblings = await this.prisma.studentGuardian.findMany({
      where: {
        guardianId: payload.guardianId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        studentId: true,
        student: {
          select: {
            id: true,
            fullName: true,
            enrollments: {
              where: {
                academicYearId: payload.academicYearId,
                isActive: true,
                deletedAt: null,
              },
              select: {
                id: true,
                studentInvoices: {
                  where: {
                    academicYearId: payload.academicYearId,
                    status: { notIn: [InvoiceStatus.CANCELLED] },
                  },
                  select: {
                    id: true,
                    invoiceNumber: true,
                    subtotal: true,
                    discountAmount: true,
                    totalAmount: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (siblings.length < 2) {
      return {
        message: 'No sibling discount applicable (less than 2 children)',
        applied: 0,
        siblings: siblings.length,
      };
    }

    // جلب قواعد خصم الإخوة
    const siblingRules = await this.prisma.discountRule.findMany({
      where: {
        discountType: DiscountType.SIBLING,
        isActive: true,
        OR: [
          { academicYearId: payload.academicYearId },
          { academicYearId: null },
        ],
      },
      orderBy: { siblingOrderFrom: 'asc' },
    });

    if (siblingRules.length === 0) {
      throw new BadRequestException(
        'No sibling discount rules configured for this year',
      );
    }

    const results: {
      studentName: string;
      invoiceNumber: string;
      siblingOrder: number;
      discountPercent: number;
      discountAmount: number;
    }[] = [];

    // تطبيق الخصم بناءً على ترتيب الأخ
    for (let i = 0; i < siblings.length; i++) {
      const siblingOrder = i + 1;
      const sibling = siblings[i];

      // البحث عن قاعدة الخصم المناسبة
      const applicableRule = siblingRules.find(
        (r) =>
          r.siblingOrderFrom !== null && siblingOrder >= r.siblingOrderFrom,
      );

      if (!applicableRule) continue;

      // تطبيق على فواتير هذا الأخ
      for (const enrollment of sibling.student.enrollments) {
        for (const invoice of enrollment.studentInvoices) {
          if (
            invoice.status === InvoiceStatus.PAID ||
            invoice.status === InvoiceStatus.CANCELLED
          ) {
            continue;
          }

          let discountAmount = 0;
          const subtotal = Number(invoice.subtotal);

          if (
            applicableRule.calculationMethod ===
            DiscountCalculationMethod.PERCENTAGE
          ) {
            discountAmount = Number(
              (subtotal * Number(applicableRule.value) / 100).toFixed(2),
            );
          } else {
            discountAmount = Number(Number(applicableRule.value).toFixed(2));
          }

          // تحديث الفاتورة
          const newTotal = Number(
            (subtotal - discountAmount + Number(invoice.totalAmount) - subtotal + Number(invoice.discountAmount)).toFixed(2),
          );

          await this.prisma.studentInvoice.update({
            where: { id: invoice.id },
            data: {
              discountAmount,
              totalAmount: Math.max(0, subtotal - discountAmount),
            },
          });

          results.push({
            studentName: sibling.student.fullName,
            invoiceNumber: invoice.invoiceNumber,
            siblingOrder,
            discountPercent: Number(applicableRule.value),
            discountAmount,
          });
        }
      }
    }

    await this.auditLogsService.record({
      actorUserId,
      action: 'SIBLING_DISCOUNT_APPLY',
      resource: 'billing-engine',
      details: {
        guardianId: payload.guardianId,
        academicYearId: payload.academicYearId,
        applied: results.length,
      },
    });

    return {
      message: `Applied sibling discount to ${results.length} invoices`,
      applied: results.length,
      siblings: siblings.length,
      details: results,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. كشف حساب الطالب — Student Account Statement
  // ═══════════════════════════════════════════════════════════════

  async getStudentStatement(enrollmentId: string) {
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: { id: enrollmentId, deletedAt: null },
      select: {
        id: true,
        studentId: true,
        academicYearId: true,
        student: {
          select: {
            id: true,
            fullName: true,
            admissionNo: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Student enrollment not found');
    }

    // جلب الفواتير مع الأقساط
    const invoices = await this.prisma.studentInvoice.findMany({
      where: {
        enrollmentId,
        status: { notIn: [InvoiceStatus.CANCELLED] },
      },
      include: {
        lines: {
          include: {
            feeStructure: {
              select: { nameAr: true, feeType: true },
            },
          },
        },
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
      orderBy: { invoiceDate: 'asc' },
    });

    // جلب المدفوعات
    const payments = await this.prisma.paymentTransaction.findMany({
      where: {
        enrollmentId,
        status: 'COMPLETED',
      },
      select: {
        id: true,
        transactionNumber: true,
        amount: true,
        paidAt: true,
        paymentMethod: true,
        receiptNumber: true,
        gateway: {
          select: { nameAr: true },
        },
      },
      orderBy: { paidAt: 'asc' },
    });

    // جلب مذكرات الائتمان/الخصم
    const creditDebitNotes = await this.prisma.creditDebitNote.findMany({
      where: {
        enrollmentId,
        status: { notIn: ['CANCELLED'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    // حساب الإجماليات
    const totalBilled = invoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0,
    );
    const totalPaid = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const totalCredits = creditDebitNotes
      .filter((n) => n.noteType === 'CREDIT')
      .reduce((sum, n) => sum + Number(n.totalAmount), 0);
    const totalDebits = creditDebitNotes
      .filter((n) => n.noteType === 'DEBIT')
      .reduce((sum, n) => sum + Number(n.totalAmount), 0);
    const balance = Number(
      (totalBilled - totalPaid - totalCredits + totalDebits).toFixed(2),
    );

    return {
      student: enrollment.student,
      academicYear: enrollment.academicYear,
      enrollmentId: enrollment.id,
      summary: {
        totalBilled: Number(totalBilled.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        totalCredits: Number(totalCredits.toFixed(2)),
        totalDebits: Number(totalDebits.toFixed(2)),
        balance,
        status: balance <= 0 ? 'SETTLED' : 'OUTSTANDING',
      },
      invoices: invoices.map((inv) => ({
        id: inv.id.toString(),
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        subtotal: Number(inv.subtotal),
        discountAmount: Number(inv.discountAmount),
        vatAmount: Number(inv.vatAmount),
        totalAmount: Number(inv.totalAmount),
        paidAmount: Number(inv.paidAmount),
        balanceDue: Number(inv.balanceDue),
        status: inv.status,
        lines: inv.lines.map((l) => ({
          description: l.descriptionAr,
          feeType: l.feeType,
          unitPrice: Number(l.unitPrice),
          discountAmount: Number(l.discountAmount),
          vatAmount: Number(l.vatAmount),
          lineTotal: Number(l.lineTotal),
        })),
        installments: inv.installments.map((inst) => ({
          number: inst.installmentNumber,
          dueDate: inst.dueDate,
          amount: Number(inst.amount),
          paidAmount: Number(inst.paidAmount),
          status: inst.status,
        })),
      })),
      payments: payments.map((p) => ({
        id: p.id.toString(),
        transactionNumber: p.transactionNumber,
        amount: Number(p.amount),
        paidAt: p.paidAt,
        paymentMethod: p.paymentMethod,
        receiptNumber: p.receiptNumber,
        gateway: p.gateway?.nameAr,
      })),
      creditDebitNotes: creditDebitNotes.map((n) => ({
        id: n.id.toString(),
        noteNumber: n.noteNumber,
        noteType: n.noteType,
        amount: Number(n.amount),
        totalAmount: Number(n.totalAmount),
        reason: n.reason,
        status: n.status,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. رصيد العائلة — Family Balance
  // ═══════════════════════════════════════════════════════════════

  async getFamilyBalance(guardianId: string) {
    const guardian = await this.prisma.guardian.findFirst({
      where: { id: guardianId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        phonePrimary: true,
      },
    });

    if (!guardian) {
      throw new NotFoundException('Guardian not found');
    }

    // جلب أبناء ولي الأمر مع بيانات الفوترة
    const studentGuardians = await this.prisma.studentGuardian.findMany({
      where: {
        guardianId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        studentId: true,
        relationship: true,
        student: {
          select: {
            id: true,
            fullName: true,
            admissionNo: true,
            enrollments: {
              where: { isActive: true, deletedAt: null },
              select: {
                id: true,
                academicYearId: true,
                academicYear: {
                  select: { name: true },
                },
                studentInvoices: {
                  where: {
                    status: { notIn: [InvoiceStatus.CANCELLED] },
                  },
                  select: {
                    totalAmount: true,
                    paidAmount: true,
                    balanceDue: true,
                    status: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    const children = studentGuardians.map((sg) => {
      const totalBilled = sg.student.enrollments.reduce(
        (sum, e) =>
          sum +
          e.studentInvoices.reduce(
            (s, inv) => s + Number(inv.totalAmount),
            0,
          ),
        0,
      );
      const totalPaid = sg.student.enrollments.reduce(
        (sum, e) =>
          sum +
          e.studentInvoices.reduce(
            (s, inv) => s + Number(inv.paidAmount),
            0,
          ),
        0,
      );
      const balance = Number((totalBilled - totalPaid).toFixed(2));

      return {
        studentId: sg.student.id,
        studentName: sg.student.fullName,
        admissionNo: sg.student.admissionNo,
        relationship: sg.relationship,
        totalBilled: Number(totalBilled.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        balance,
        enrollmentCount: sg.student.enrollments.length,
        hasOverdue: sg.student.enrollments.some((e) =>
          e.studentInvoices.some(
            (inv) =>
              Number(inv.balanceDue) > 0 &&
              inv.status !== InvoiceStatus.PAID,
          ),
        ),
      };
    });

    const familyTotalBilled = children.reduce(
      (sum, c) => sum + c.totalBilled,
      0,
    );
    const familyTotalPaid = children.reduce(
      (sum, c) => sum + c.totalPaid,
      0,
    );
    const familyBalance = Number(
      (familyTotalBilled - familyTotalPaid).toFixed(2),
    );

    return {
      guardian: {
        id: guardian.id,
        fullName: guardian.fullName,
        phone: guardian.phonePrimary,
      },
      summary: {
        childrenCount: children.length,
        totalBilled: Number(familyTotalBilled.toFixed(2)),
        totalPaid: Number(familyTotalPaid.toFixed(2)),
        balance: familyBalance,
        status: familyBalance <= 0 ? 'SETTLED' : 'OUTSTANDING',
      },
      children,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. معالجة انسحاب طالب — Proration & Settlement
  // ═══════════════════════════════════════════════════════════════

  async processWithdrawal(payload: ProcessWithdrawalDto, actorUserId: string) {
    const withdrawalDate = new Date(payload.withdrawalDate);

    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        id: payload.enrollmentId,
        deletedAt: null,
      },
      select: {
        id: true,
        academicYearId: true,
        status: true,
        isActive: true,
        student: { select: { id: true, fullName: true } },
        academicYear: { select: { id: true, name: true, startDate: true, endDate: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.status !== StudentEnrollmentStatus.ACTIVE) {
      throw new BadRequestException('Only ACTIVE enrollments can be withdrawn');
    }

    const term = payload.academicTermId
      ? await this.prisma.academicTerm.findFirst({
          where: { id: payload.academicTermId, academicYearId: enrollment.academicYearId },
          select: { id: true, name: true, startDate: true, endDate: true },
        })
      : await this.prisma.academicTerm.findFirst({
          where: {
            academicYearId: enrollment.academicYearId,
            startDate: { lte: withdrawalDate },
            endDate: { gte: withdrawalDate },
            isActive: true,
          },
          select: { id: true, name: true, startDate: true, endDate: true },
        });

    const periodStart = term?.startDate ?? enrollment.academicYear.startDate;
    const periodEnd = term?.endDate ?? enrollment.academicYear.endDate;

    const totalSchoolDays = await this.countSchoolDays(
      enrollment.academicYearId,
      periodStart,
      periodEnd,
    );
    const attendedDays = await this.countSchoolDays(
      enrollment.academicYearId,
      periodStart,
      withdrawalDate,
    );

    const effectiveTotalDays =
      totalSchoolDays > 0
        ? totalSchoolDays
        : this.fallbackDaysDiff(periodStart, periodEnd);
    const effectiveAttendedDays =
      totalSchoolDays > 0
        ? attendedDays
        : this.fallbackDaysDiff(periodStart, withdrawalDate);

    const prorationRatio =
      effectiveTotalDays > 0
        ? Number((effectiveAttendedDays / effectiveTotalDays).toFixed(4))
        : 0;

    const invoices = await this.prisma.studentInvoice.findMany({
      where: {
        enrollmentId: enrollment.id,
        status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.CREDITED] },
        invoiceDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      orderBy: { invoiceDate: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        totalAmount: true,
        paidAmount: true,
      },
    });

    const totalFee = invoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0,
    );
    const totalPaid = invoices.reduce(
      (sum, inv) => sum + Number(inv.paidAmount),
      0,
    );

    const earnedFee = this.roundMoney(totalFee * prorationRatio);
    const adjustment = this.roundMoney(totalFee - earnedFee);

    let creditNoteId: string | null = null;

    if (adjustment > 0.01 && invoices.length > 0) {
      const targetInvoice = invoices[0];
      const note = await this.creditDebitNotesService.create(
        {
          noteType: CreditDebitNoteType.CREDIT,
          originalInvoiceId: targetInvoice.id.toString(),
          enrollmentId: enrollment.id,
          amount: adjustment,
          vatAmount: 0,
          reason: CreditDebitNoteReason.WITHDRAWAL,
          reasonDetails: payload.reason?.trim(),
        },
        actorUserId,
      );

      await this.creditDebitNotesService.approve(note.id.toString(), actorUserId);
      const applied = await this.creditDebitNotesService.apply(
        note.id.toString(),
        actorUserId,
      );
      creditNoteId = applied.id.toString();
    }

    if (invoices.length > 0) {
      await this.prisma.invoiceInstallment.updateMany({
        where: {
          invoiceId: { in: invoices.map((inv) => inv.id) },
          dueDate: { gt: withdrawalDate },
          status: { in: [InstallmentStatus.PENDING, InstallmentStatus.PARTIAL, InstallmentStatus.OVERDUE] },
        },
        data: {
          status: InstallmentStatus.CANCELLED,
          notes: 'Cancelled due to withdrawal',
        },
      });
    }

    await this.prisma.studentEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: StudentEnrollmentStatus.WITHDRAWN,
        isActive: false,
        notes: payload.reason?.trim(),
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'BILLING_PROCESS_WITHDRAWAL',
      resource: 'billing-engine',
      resourceId: enrollment.id,
      details: {
        enrollmentId: enrollment.id,
        termId: term?.id,
        totalFee,
        earnedFee,
        totalPaid,
        prorationRatio,
        adjustment,
        creditNoteId,
      },
    });

    return {
      enrollmentId: enrollment.id,
      studentName: enrollment.student.fullName,
      term: term
        ? { id: term.id, name: term.name, startDate: term.startDate, endDate: term.endDate }
        : null,
      period: { startDate: periodStart, endDate: periodEnd },
      totals: {
        totalFee: this.roundMoney(totalFee),
        earnedFee,
        totalPaid: this.roundMoney(totalPaid),
        adjustment,
      },
      proration: {
        totalSchoolDays: effectiveTotalDays,
        attendedDays: effectiveAttendedDays,
        ratio: prorationRatio,
      },
      creditNoteId,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════

  private async calculateAllSiblingDiscounts(
    academicYearId: string,
    studentIds: string[],
  ): Promise<Map<string, number>> {
    const discountMap = new Map<string, number>();

    // جلب قواعد خصم الإخوة
    const siblingRules = await this.prisma.discountRule.findMany({
      where: {
        discountType: DiscountType.SIBLING,
        isActive: true,
        OR: [
          { academicYearId },
          { academicYearId: null },
        ],
      },
      orderBy: { siblingOrderFrom: 'asc' },
    });

    if (siblingRules.length === 0) return discountMap;

    // جلب أولياء الأمور لكل طالب
    const guardianLinks = await this.prisma.studentGuardian.findMany({
      where: {
        studentId: { in: studentIds },
        isActive: true,
        deletedAt: null,
        isPrimary: true,
      },
      select: {
        studentId: true,
        guardianId: true,
      },
    });

    // تجميع الأبناء حسب ولي الأمر
    const guardianChildren = new Map<string, string[]>();
    for (const link of guardianLinks) {
      const existing = guardianChildren.get(link.guardianId) ?? [];
      existing.push(link.studentId);
      guardianChildren.set(link.guardianId, existing);
    }

    // تطبيق الخصم على الأبناء
    for (const [, children] of guardianChildren) {
      if (children.length < 2) continue;

      for (let i = 0; i < children.length; i++) {
        const siblingOrder = i + 1;
        const applicableRule = siblingRules.find(
          (r) =>
            r.siblingOrderFrom !== null && siblingOrder >= r.siblingOrderFrom,
        );

        if (applicableRule) {
          discountMap.set(children[i], Number(applicableRule.value));
        }
      }
    }

    return discountMap;
  }

  private async findBaseCurrency() {
    return this.prisma.currency.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        isBase: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  private async countSchoolDays(
    academicYearId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.calendarMaster.count({
      where: {
        academicYearId,
        gregorianDate: {
          gte: startDate,
          lte: endDate,
        },
        isSchoolDay: true,
        deletedAt: null,
      },
    });
  }

  private fallbackDaysDiff(startDate: Date, endDate: Date) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(diff + 1, 0);
  }

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }
}
