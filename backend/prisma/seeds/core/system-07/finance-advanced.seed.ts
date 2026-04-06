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
  { nameAr: 'الإدارة العامة', nameEn: 'General Administration' },
  { nameAr: 'الشؤون الأكاديمية', nameEn: 'Academic Affairs' },
  { nameAr: 'النقل والمواصلات', nameEn: 'Transport' },
  { nameAr: 'الصيانة والتشغيل', nameEn: 'Maintenance' },
  { nameAr: 'تقنية المعلومات', nameEn: 'Information Technology' },
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
    const existing = await prisma.costCenter.findFirst({
      where: { nameAr: center.nameAr },
      select: { id: true },
    });

    if (existing) {
      await prisma.costCenter.update({
        where: { id: existing.id },
        data: {
          nameAr: center.nameAr,
          nameEn: center.nameEn,
          isActive: true,
        },
      });
      continue;
    }

    await prisma.costCenter.create({
      data: {
        nameAr: center.nameAr,
        nameEn: center.nameEn,
        isActive: true,
      },
    });
  }
}
