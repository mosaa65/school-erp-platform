import {
  LookupAppliesTo,
  LookupRelationshipGender,
  type PrismaClient,
} from '@prisma/client';

export async function seedSystem01Lookups(prisma: PrismaClient) {
  const defaultBloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  for (const bloodTypeName of defaultBloodTypes) {
    await prisma.lookupBloodType.upsert({
      where: { name: bloodTypeName },
      update: {
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        name: bloodTypeName,
        isActive: true,
      },
    });
  }

  const defaultIdTypes = [
    { code: 'NATIONAL_ID', nameAr: 'بطاقة شخصية' },
    { code: 'PASSPORT', nameAr: 'جواز سفر' },
    { code: 'BIRTH_CERTIFICATE', nameAr: 'شهادة ميلاد' },
    { code: 'FAMILY_CARD', nameAr: 'بطاقة عائلية' },
  ];

  for (const item of defaultIdTypes) {
    await prisma.lookupIdType.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        isActive: true,
      },
    });
  }

  const defaultOwnershipTypes = [
    { code: 'PUBLIC', nameAr: 'حكومية' },
    { code: 'PRIVATE', nameAr: 'خاصة' },
    { code: 'COMMUNITY', nameAr: 'أهلية' },
  ];

  for (const item of defaultOwnershipTypes) {
    await prisma.lookupOwnershipType.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        isActive: true,
      },
    });
  }

  const defaultPeriods = [
    { code: 'MORNING', nameAr: 'صباحية' },
    { code: 'EVENING', nameAr: 'مسائية' },
    { code: 'BOTH', nameAr: 'كلاهما' },
  ];

  for (const item of defaultPeriods) {
    await prisma.lookupPeriod.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        isActive: true,
      },
    });
  }

  const defaultEnrollmentStatuses = [
    { code: 'NEW', nameAr: 'مستجد' },
    { code: 'TRANSFERRED', nameAr: 'منقول' },
    { code: 'ACTIVE', nameAr: 'منتظم' },
    { code: 'PROMOTED', nameAr: 'مُرَقّى' },
    { code: 'REPEATED', nameAr: 'معيد' },
    { code: 'WITHDRAWN', nameAr: 'منسحب' },
    { code: 'GRADUATED', nameAr: 'متخرج' },
    { code: 'SUSPENDED', nameAr: 'موقوف' },
  ];

  for (const item of defaultEnrollmentStatuses) {
    await prisma.lookupEnrollmentStatus.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        isActive: true,
      },
    });
  }

  const defaultOrphanStatuses = [
    { code: 'NONE', nameAr: 'غير يتيم' },
    { code: 'FATHER_DECEASED', nameAr: 'يتيم الأب' },
    { code: 'MOTHER_DECEASED', nameAr: 'يتيم الأم' },
    { code: 'BOTH_DECEASED', nameAr: 'يتيم الأبوين (لطيم)' },
  ];

  for (const item of defaultOrphanStatuses) {
    await prisma.lookupOrphanStatus.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        isActive: true,
      },
    });
  }

  const defaultAbilityLevels = [
    { code: 'EXCELLENT', nameAr: 'ممتاز' },
    { code: 'VERY_GOOD', nameAr: 'جيد جداً' },
    { code: 'GOOD', nameAr: 'جيد' },
    { code: 'AVERAGE', nameAr: 'متوسط' },
    { code: 'WEAK', nameAr: 'ضعيف' },
  ];

  for (const item of defaultAbilityLevels) {
    await prisma.lookupAbilityLevel.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        isActive: true,
      },
    });
  }

  const defaultActivityTypes = [
    { code: 'SCIENTIFIC', nameAr: 'علمي' },
    { code: 'CULTURAL', nameAr: 'ثقافي' },
    { code: 'SPORTS', nameAr: 'رياضي' },
    { code: 'SOCIAL', nameAr: 'اجتماعي' },
    { code: 'SCOUT', nameAr: 'كشفي' },
  ];

  for (const item of defaultActivityTypes) {
    await prisma.lookupActivityType.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        isActive: true,
      },
    });
  }

  const schoolTypes = [
    { code: 'PRIMARY', nameAr: 'أساسية', nameEn: 'Primary' },
    { code: 'SECONDARY', nameAr: 'ثانوية', nameEn: 'Secondary' },
    { code: 'MIXED', nameAr: 'مختلطة', nameEn: 'Mixed' },
  ];

  for (const item of schoolTypes) {
    await prisma.lookupSchoolType.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        isActive: true,
      },
    });
  }

  const genders = [
    { code: 'MALE', nameAr: 'ذكر', nameEn: 'Male' },
    { code: 'FEMALE', nameAr: 'أنثى', nameEn: 'Female' },
    { code: 'OTHER', nameAr: 'آخر', nameEn: 'Other' },
  ];

  for (const item of genders) {
    await prisma.lookupGender.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        isActive: true,
      },
    });
  }

  const qualifications = [
    { code: 'EXPERIENCE', nameAr: 'خبرة', sortOrder: 1 },
    { code: 'PRIMARY', nameAr: 'أساسي', sortOrder: 2 },
    { code: 'SECONDARY', nameAr: 'ثانوي', sortOrder: 3 },
    { code: 'TEACHERS_DIPLOMA', nameAr: 'دبلوم معلمين', sortOrder: 4 },
    { code: 'HIGHER_DIPLOMA', nameAr: 'دبلوم عالي', sortOrder: 5 },
    { code: 'BACHELOR', nameAr: 'جامعي', sortOrder: 6 },
    { code: 'MASTER', nameAr: 'ماجستير', sortOrder: 7 },
    { code: 'PHD', nameAr: 'دكتوراه', sortOrder: 8 },
    { code: 'OTHER', nameAr: 'أخرى', sortOrder: 99 },
  ];

  for (const item of qualifications) {
    await prisma.lookupQualification.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        sortOrder: item.sortOrder,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        sortOrder: item.sortOrder,
        isActive: true,
      },
    });
  }

  const jobRoles = [
    { code: 'PRINCIPAL', nameAr: 'مدير', nameArFemale: 'مديرة' },
    { code: 'SUPERVISOR', nameAr: 'مشرف', nameArFemale: 'مشرفة' },
    { code: 'TEACHER', nameAr: 'معلم', nameArFemale: 'معلمة' },
    { code: 'MENTOR', nameAr: 'مربي', nameArFemale: 'مربية' },
    { code: 'LEADER', nameAr: 'رائد', nameArFemale: 'رائدة' },
    { code: 'ADMIN', nameAr: 'إداري', nameArFemale: 'إدارية' },
    { code: 'GUARD', nameAr: 'حارس', nameArFemale: 'حارسة' },
    { code: 'CLEANER', nameAr: 'عامل نظافة', nameArFemale: 'عاملة نظافة' },
  ];

  for (const item of jobRoles) {
    await prisma.lookupJobRole.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        nameArFemale: item.nameArFemale,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        nameArFemale: item.nameArFemale,
        isActive: true,
      },
    });
  }

  const days = [
    { code: 'SATURDAY', nameAr: 'السبت', nameEn: 'Saturday', orderNum: 1, isWorkingDay: true },
    { code: 'SUNDAY', nameAr: 'الأحد', nameEn: 'Sunday', orderNum: 2, isWorkingDay: true },
    { code: 'MONDAY', nameAr: 'الاثنين', nameEn: 'Monday', orderNum: 3, isWorkingDay: true },
    { code: 'TUESDAY', nameAr: 'الثلاثاء', nameEn: 'Tuesday', orderNum: 4, isWorkingDay: true },
    { code: 'WEDNESDAY', nameAr: 'الأربعاء', nameEn: 'Wednesday', orderNum: 5, isWorkingDay: true },
    { code: 'THURSDAY', nameAr: 'الخميس', nameEn: 'Thursday', orderNum: 6, isWorkingDay: true },
    { code: 'FRIDAY', nameAr: 'الجمعة', nameEn: 'Friday', orderNum: 7, isWorkingDay: false },
  ];

  for (const item of days) {
    await prisma.lookupDay.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        orderNum: item.orderNum,
        isWorkingDay: item.isWorkingDay,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        orderNum: item.orderNum,
        isWorkingDay: item.isWorkingDay,
        isActive: true,
      },
    });
  }

  const attendanceStatuses = [
    {
      code: 'PRESENT',
      nameAr: 'حاضر',
      appliesTo: LookupAppliesTo.ALL,
      colorCode: '#28A745',
    },
    {
      code: 'ABSENT',
      nameAr: 'غائب',
      appliesTo: LookupAppliesTo.ALL,
      colorCode: '#DC3545',
    },
    {
      code: 'LATE',
      nameAr: 'متأخر',
      appliesTo: LookupAppliesTo.ALL,
      colorCode: '#FFC107',
    },
    {
      code: 'LEFT',
      nameAr: 'منصرف',
      appliesTo: LookupAppliesTo.STUDENTS,
      colorCode: '#17A2B8',
    },
    {
      code: 'ABSENT_PERMITTED',
      nameAr: 'غائب بإذن',
      appliesTo: LookupAppliesTo.ALL,
      colorCode: '#6C757D',
    },
    {
      code: 'ABSENT_EXCUSED',
      nameAr: 'غائب بعذر',
      appliesTo: LookupAppliesTo.ALL,
      colorCode: '#6C757D',
    },
  ];

  for (const item of attendanceStatuses) {
    await prisma.lookupAttendanceStatus.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        appliesTo: item.appliesTo,
        colorCode: item.colorCode,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        appliesTo: item.appliesTo,
        colorCode: item.colorCode,
        isActive: true,
      },
    });
  }

  const maritalStatuses = [
    { code: 'SINGLE', nameAr: 'أعزب' },
    { code: 'MARRIED', nameAr: 'متزوج' },
    { code: 'DIVORCED', nameAr: 'مطلق' },
    { code: 'WIDOWED', nameAr: 'أرمل' },
  ];

  for (const item of maritalStatuses) {
    await prisma.lookupMaritalStatus.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        isActive: true,
      },
    });
  }

  const healthStatuses = [
    { code: 'HEALTHY', nameAr: 'سليم', requiresDetails: false },
    { code: 'CHRONIC_DISEASE', nameAr: 'مرض مزمن', requiresDetails: true },
    { code: 'SPECIAL_NEEDS', nameAr: 'احتياجات خاصة', requiresDetails: true },
    { code: 'DISABILITY', nameAr: 'إعاقة', requiresDetails: true },
    { code: 'OTHER', nameAr: 'أخرى', requiresDetails: true },
  ];

  for (const item of healthStatuses) {
    await prisma.lookupHealthStatus.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        requiresDetails: item.requiresDetails,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        requiresDetails: item.requiresDetails,
        isActive: true,
      },
    });
  }

  // Keep backward compatibility with older seeded codes while hiding them from forms.
  await prisma.lookupHealthStatus.updateMany({
    where: {
      code: {
        in: ['SICK', 'DISABLED'],
      },
    },
    data: {
      isActive: false,
      updatedById: null,
    },
  });

  const relationshipTypes = [
    { code: 'FATHER', nameAr: 'أب', gender: LookupRelationshipGender.MALE },
    { code: 'MOTHER', nameAr: 'أم', gender: LookupRelationshipGender.FEMALE },
    { code: 'BROTHER', nameAr: 'أخ', gender: LookupRelationshipGender.MALE },
    { code: 'SISTER', nameAr: 'أخت', gender: LookupRelationshipGender.FEMALE },
    { code: 'UNCLE', nameAr: 'عم/خال', gender: LookupRelationshipGender.MALE },
    { code: 'AUNT', nameAr: 'عمة/خالة', gender: LookupRelationshipGender.FEMALE },
    { code: 'UNCLE_PATERNAL', nameAr: 'عم', gender: LookupRelationshipGender.MALE },
    { code: 'AUNT_PATERNAL', nameAr: 'عمة', gender: LookupRelationshipGender.FEMALE },
    { code: 'UNCLE_MATERNAL', nameAr: 'خال', gender: LookupRelationshipGender.MALE },
    { code: 'AUNT_MATERNAL', nameAr: 'خالة', gender: LookupRelationshipGender.FEMALE },
    { code: 'GRANDFATHER', nameAr: 'جد', gender: LookupRelationshipGender.MALE },
    { code: 'GRANDMOTHER', nameAr: 'جدة', gender: LookupRelationshipGender.FEMALE },
    { code: 'GUARDIAN', nameAr: 'وصي', gender: LookupRelationshipGender.ALL },
    { code: 'OTHER', nameAr: 'أخرى', gender: LookupRelationshipGender.ALL },
  ];

  for (const item of relationshipTypes) {
    await prisma.lookupRelationshipType.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        gender: item.gender,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        gender: item.gender,
        isActive: true,
      },
    });
  }

  const lookupTalents = [
    {
      code: 'SPORTS',
      nameAr: 'رياضة',
      category: 'بدنية',
      appliesTo: LookupAppliesTo.ALL,
    },
    {
      code: 'ARTS',
      nameAr: 'فنون',
      category: 'إبداعية',
      appliesTo: LookupAppliesTo.ALL,
    },
    {
      code: 'SCIENCE',
      nameAr: 'علوم',
      category: 'أكاديمية',
      appliesTo: LookupAppliesTo.STUDENTS,
    },
    {
      code: 'LEADERSHIP',
      nameAr: 'قيادة',
      category: 'مهارية',
      appliesTo: LookupAppliesTo.EMPLOYEES,
    },
  ];

  for (const item of lookupTalents) {
    await prisma.lookupTalent.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        category: item.category,
        appliesTo: item.appliesTo,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        category: item.category,
        appliesTo: item.appliesTo,
        isActive: true,
      },
    });
  }

  const hijriMonths = [
    { code: 'MUHARRAM', nameAr: 'محرم', orderNum: 1 },
    { code: 'SAFAR', nameAr: 'صفر', orderNum: 2 },
    { code: 'RABI_I', nameAr: 'ربيع أول', orderNum: 3 },
    { code: 'RABI_II', nameAr: 'ربيع ثاني', orderNum: 4 },
    { code: 'JUMADA_I', nameAr: 'جماد أول', orderNum: 5 },
    { code: 'JUMADA_II', nameAr: 'جماد ثاني', orderNum: 6 },
    { code: 'RAJAB', nameAr: 'رجب', orderNum: 7 },
    { code: 'SHAABAN', nameAr: 'شعبان', orderNum: 8 },
    { code: 'RAMADAN', nameAr: 'رمضان', orderNum: 9 },
    { code: 'SHAWWAL', nameAr: 'شوال', orderNum: 10 },
    { code: 'DHUL_QIDAH', nameAr: 'ذو القعدة', orderNum: 11 },
    { code: 'DHUL_HIJJAH', nameAr: 'ذو الحجة', orderNum: 12 },
    { code: 'OTHER', nameAr: 'أخرى', orderNum: 13 },
  ];

  for (const item of hijriMonths) {
    await prisma.lookupHijriMonth.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        orderNum: item.orderNum,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        orderNum: item.orderNum,
        isActive: true,
      },
    });
  }

  const weeks = [
    { code: 'WEEK_1', nameAr: 'الأول', orderNum: 1 },
    { code: 'WEEK_2', nameAr: 'الثاني', orderNum: 2 },
    { code: 'WEEK_3', nameAr: 'الثالث', orderNum: 3 },
    { code: 'WEEK_4', nameAr: 'الرابع', orderNum: 4 },
    { code: 'WEEK_5', nameAr: 'الخامس', orderNum: 5 },
    { code: 'OTHER', nameAr: 'أخرى', orderNum: 6 },
  ];

  for (const item of weeks) {
    await prisma.lookupWeek.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        orderNum: item.orderNum,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        orderNum: item.orderNum,
        isActive: true,
      },
    });
  }

  const buildings = [
    { code: 'NEW_BUILDING', nameAr: 'المدرسة الجديدة' },
    { code: 'OLD_BUILDING', nameAr: 'المدرسة القديمة' },
    { code: 'OTHER', nameAr: 'أخرى' },
  ];

  for (const item of buildings) {
    await prisma.lookupBuilding.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        isActive: true,
      },
    });
  }

  const governorates = [
    { code: 'SAN', nameAr: 'صنعاء' },
    { code: 'ADN', nameAr: 'عدن' },
    { code: 'TAZ', nameAr: 'تعز' },
    { code: 'HOD', nameAr: 'الحديدة' },
    { code: 'IBB', nameAr: 'إب' },
    { code: 'DHM', nameAr: 'ذمار' },
    { code: 'HDR', nameAr: 'حضرموت' },
    { code: 'MHR', nameAr: 'المهرة' },
    { code: 'SHB', nameAr: 'شبوة' },
    { code: 'ABY', nameAr: 'أبين' },
    { code: 'LAH', nameAr: 'لحج' },
    { code: 'DAL', nameAr: 'الضالع' },
    { code: 'BAY', nameAr: 'البيضاء' },
    { code: 'MAR', nameAr: 'مأرب' },
    { code: 'JOF', nameAr: 'الجوف' },
    { code: 'SAD', nameAr: 'صعدة' },
    { code: 'HAJ', nameAr: 'حجة' },
    { code: 'MAH', nameAr: 'المحويت' },
    { code: 'RAY', nameAr: 'ريمة' },
    { code: 'AMR', nameAr: 'عمران' },
    { code: 'SOC', nameAr: 'سقطرى' },
  ];

  for (const item of governorates) {
    await prisma.governorate.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        isActive: true,
      },
    });
  }

  const ibbGovernorate = await prisma.governorate.findUnique({
    where: { code: 'IBB' },
    select: { id: true },
  });

  if (ibbGovernorate) {
    const directorate = await prisma.directorate.upsert({
      where: {
        governorateId_nameAr: {
          governorateId: ibbGovernorate.id,
          nameAr: 'العدين',
        },
      },
      update: {
        code: 'ALUDAYN',
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        governorateId: ibbGovernorate.id,
        code: 'ALUDAYN',
        nameAr: 'العدين',
        isActive: true,
      },
    });

    const subDistrict = await prisma.subDistrict.upsert({
      where: {
        directorateId_nameAr: {
          directorateId: directorate.id,
          nameAr: 'بني عواض',
        },
      },
      update: {
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        directorateId: directorate.id,
        nameAr: 'بني عواض',
        isActive: true,
      },
    });

    const village = await prisma.village.upsert({
      where: {
        subDistrictId_nameAr: {
          subDistrictId: subDistrict.id,
          nameAr: 'النخلة',
        },
      },
      update: {
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        subDistrictId: subDistrict.id,
        nameAr: 'النخلة',
        isActive: true,
      },
    });

    const ruralLocality = await prisma.locality.findFirst({
      where: {
        villageId: village.id,
        directorateId: null,
        nameAr: 'الحارة الغربية',
      },
      select: { id: true },
    });

    if (!ruralLocality) {
      await prisma.locality.create({
        data: {
          villageId: village.id,
          nameAr: 'الحارة الغربية',
          localityType: 'RURAL',
          isActive: true,
        },
      });
    } else {
      await prisma.locality.update({
        where: { id: ruralLocality.id },
        data: {
          localityType: 'RURAL',
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
      });
    }

    const urbanLocality = await prisma.locality.findFirst({
      where: {
        directorateId: directorate.id,
        villageId: null,
        nameAr: 'الحي المركزي',
      },
      select: { id: true },
    });

    if (!urbanLocality) {
      await prisma.locality.create({
        data: {
          directorateId: directorate.id,
          nameAr: 'الحي المركزي',
          localityType: 'URBAN',
          isActive: true,
        },
      });
    } else {
      await prisma.locality.update({
        where: { id: urbanLocality.id },
        data: {
          localityType: 'URBAN',
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
      });
    }
  }
}
