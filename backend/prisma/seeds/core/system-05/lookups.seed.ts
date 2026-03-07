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

  const defaultGradeDescriptions = [
    {
      minPercentage: 95,
      maxPercentage: 100,
      nameAr: 'ممتاز مرتفع',
      nameEn: 'Outstanding',
      colorCode: '#1abc9c',
      sortOrder: 1,
    },
    {
      minPercentage: 90,
      maxPercentage: 94.99,
      nameAr: 'ممتاز',
      nameEn: 'Excellent',
      colorCode: '#2ecc71',
      sortOrder: 2,
    },
    {
      minPercentage: 85,
      maxPercentage: 89.99,
      nameAr: 'جيد جدا مرتفع',
      nameEn: 'Very Good+',
      colorCode: '#27ae60',
      sortOrder: 3,
    },
    {
      minPercentage: 80,
      maxPercentage: 84.99,
      nameAr: 'جيد جدا',
      nameEn: 'Very Good',
      colorCode: '#3498db',
      sortOrder: 4,
    },
    {
      minPercentage: 75,
      maxPercentage: 79.99,
      nameAr: 'جيد مرتفع',
      nameEn: 'Good+',
      colorCode: '#2980b9',
      sortOrder: 5,
    },
    {
      minPercentage: 70,
      maxPercentage: 74.99,
      nameAr: 'جيد',
      nameEn: 'Good',
      colorCode: '#f39c12',
      sortOrder: 6,
    },
    {
      minPercentage: 65,
      maxPercentage: 69.99,
      nameAr: 'مقبول مرتفع',
      nameEn: 'Acceptable+',
      colorCode: '#e67e22',
      sortOrder: 7,
    },
    {
      minPercentage: 60,
      maxPercentage: 64.99,
      nameAr: 'مقبول',
      nameEn: 'Acceptable',
      colorCode: '#d35400',
      sortOrder: 8,
    },
    {
      minPercentage: 50,
      maxPercentage: 59.99,
      nameAr: 'دون المتوسط',
      nameEn: 'Below Avg',
      colorCode: '#c0392b',
      sortOrder: 9,
    },
    {
      minPercentage: 0,
      maxPercentage: 49.99,
      nameAr: 'ضعيف',
      nameEn: 'Weak',
      colorCode: '#e74c3c',
      sortOrder: 10,
    },
  ];

  for (const gradeDescription of defaultGradeDescriptions) {
    await prisma.lookupGradeDescription.upsert({
      where: {
        minPercentage_maxPercentage: {
          minPercentage: gradeDescription.minPercentage,
          maxPercentage: gradeDescription.maxPercentage,
        },
      },
      update: {
        nameAr: gradeDescription.nameAr,
        nameEn: gradeDescription.nameEn,
        colorCode: gradeDescription.colorCode,
        sortOrder: gradeDescription.sortOrder,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        minPercentage: gradeDescription.minPercentage,
        maxPercentage: gradeDescription.maxPercentage,
        nameAr: gradeDescription.nameAr,
        nameEn: gradeDescription.nameEn,
        colorCode: gradeDescription.colorCode,
        sortOrder: gradeDescription.sortOrder,
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
