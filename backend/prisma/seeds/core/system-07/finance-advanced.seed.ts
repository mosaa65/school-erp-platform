import { DocumentType, type PrismaClient } from '@prisma/client';

const DEFAULT_DOCUMENT_SEQUENCES = [
  { documentType: DocumentType.JOURNAL_ENTRY, prefix: 'JE' },
  { documentType: DocumentType.INVOICE, prefix: 'INV' },
  { documentType: DocumentType.PAYMENT, prefix: 'TXN' },
  { documentType: DocumentType.CREDIT_NOTE, prefix: 'CN' },
  { documentType: DocumentType.DEBIT_NOTE, prefix: 'DN' },
  { documentType: DocumentType.RECEIPT, prefix: 'RCP' },
];

const DEFAULT_COST_CENTERS = [
  { code: 'CC-ADMIN', nameAr: 'الإدارة العامة', nameEn: 'General Administration' },
  { code: 'CC-ACAD', nameAr: 'الشؤون الأكاديمية', nameEn: 'Academic Affairs' },
  { code: 'CC-TRANS', nameAr: 'النقل والمواصلات', nameEn: 'Transport' },
  { code: 'CC-MAINT', nameAr: 'الصيانة والتشغيل', nameEn: 'Maintenance' },
  { code: 'CC-IT', nameAr: 'تقنية المعلومات', nameEn: 'Information Technology' },
];

export async function seedSystem07FinanceAdvanced(prisma: PrismaClient) {
  for (const sequence of DEFAULT_DOCUMENT_SEQUENCES) {
    const existing = await prisma.documentSequence.findFirst({
      where: {
        documentType: sequence.documentType,
        fiscalYearId: null,
        branchId: null,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.documentSequence.update({
        where: { id: existing.id },
        data: {
          prefix: sequence.prefix,
          numberFormat: '{PREFIX}-{YEAR}-{SEQ:5}',
          isActive: true,
        },
      });
      continue;
    }

    await prisma.documentSequence.create({
      data: {
        documentType: sequence.documentType,
        prefix: sequence.prefix,
        numberFormat: '{PREFIX}-{YEAR}-{SEQ:5}',
        isActive: true,
      },
    });
  }

  for (const center of DEFAULT_COST_CENTERS) {
    await prisma.costCenter.upsert({
      where: { code: center.code },
      update: {
        nameAr: center.nameAr,
        nameEn: center.nameEn,
        isActive: true,
      },
      create: {
        code: center.code,
        nameAr: center.nameAr,
        nameEn: center.nameEn,
        isActive: true,
      },
    });
  }
}
