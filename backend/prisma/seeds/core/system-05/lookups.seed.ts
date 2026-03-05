import type { PrismaClient } from '@prisma/client';

export async function seedSystem05Lookups(prisma: PrismaClient) {
  const defaultHomeworkTypes = [
    {
      code: 'HOMEWORK',
      name: 'واجب منزلي',
      description: 'واجب مدرسي قياسي يُكلّف به الطالب خارج الحصة',
    },
    {
      code: 'RESEARCH',
      name: 'مهمة بحثية',
      description: 'واجب مبني على البحث وجمع المعلومات',
    },
    {
      code: 'PROJECT',
      name: 'مشروع',
      description: 'تكليف على شكل مشروع فردي أو جماعي',
    },
    {
      code: 'REPORT',
      name: 'تقرير',
      description: 'تكليف بإعداد تقرير كتابي',
    },
    {
      code: 'CLASS_ACTIVITY',
      name: 'نشاط صفي',
      description: 'نشاط داخل الصف يُتابَع كسجل واجب',
    },
    {
      code: 'OTHER',
      name: 'أخرى',
      description: 'نوع واجب آخر',
    },
  ];

  for (const homeworkType of defaultHomeworkTypes) {
    await prisma.homeworkType.upsert({
      where: {
        code: homeworkType.code,
      },
      update: {
        name: homeworkType.name,
        description: homeworkType.description,
        isSystem: true,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: homeworkType.code,
        name: homeworkType.name,
        description: homeworkType.description,
        isSystem: true,
        isActive: true,
      },
    });
  }

  const defaultAnnualStatuses = [
    {
      code: 'PASS',
      name: 'ناجح',
      description: 'حقق الطالب درجة النجاح في المادة ضمن النتيجة السنوية',
    },
    {
      code: 'FAIL',
      name: 'راسب',
      description: 'لم يحقق الطالب درجة النجاح في المادة ضمن النتيجة السنوية',
    },
    {
      code: 'MAKEUP',
      name: 'مكمل',
      description: 'الطالب يحتاج اختبار تعويض/دور ثاني في المادة',
    },
    {
      code: 'DEPRIVED',
      name: 'محروم',
      description: 'الطالب محروم من نتيجة المادة سنويًا وفق الضوابط',
    },
  ];

  for (const annualStatus of defaultAnnualStatuses) {
    await prisma.annualStatusLookup.upsert({
      where: {
        code: annualStatus.code,
      },
      update: {
        name: annualStatus.name,
        description: annualStatus.description,
        isSystem: true,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: annualStatus.code,
        name: annualStatus.name,
        description: annualStatus.description,
        isSystem: true,
        isActive: true,
      },
    });
  }

  const defaultPromotionDecisions = [
    {
      code: 'PROMOTED',
      name: 'مُرَقّى',
      description: 'تمت ترقية الطالب للصف التالي دون شروط',
    },
    {
      code: 'RETAINED',
      name: 'إعادة',
      description: 'يبقى الطالب في نفس الصف ويعيد العام',
    },
    {
      code: 'DISMISSED',
      name: 'مفصول',
      description: 'تم فصل الطالب وفق السياسة المعتمدة',
    },
    {
      code: 'CONDITIONAL',
      name: 'ترقية مشروطة',
      description: 'ترقية الطالب للصف التالي مشروطة بمعالجات محددة',
    },
  ];

  for (const promotionDecision of defaultPromotionDecisions) {
    await prisma.promotionDecisionLookup.upsert({
      where: {
        code: promotionDecision.code,
      },
      update: {
        name: promotionDecision.name,
        description: promotionDecision.description,
        isSystem: true,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: promotionDecision.code,
        name: promotionDecision.name,
        description: promotionDecision.description,
        isSystem: true,
        isActive: true,
      },
    });
  }
}
