import {
  AcademicTermType,
  AcademicYearStatus,
  EmployeeGender,
  EmployeeSystemAccessStatus,
  GradeStage,
  GuardianRelationship,
  PrismaClient,
  StudentEnrollmentStatus,
  StudentGender,
  SubjectCategory,
  TimetableDay,
} from '@prisma/client';

const prisma = new PrismaClient();

function asUtcDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`);
}

async function main() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (nodeEnv === 'production' && process.env.ALLOW_PRODUCTION_DEMO_SEED !== 'true') {
    throw new Error(
      'Demo seed is blocked in production. Set ALLOW_PRODUCTION_DEMO_SEED=true to override intentionally.',
    );
  }

  const academicYear = await prisma.academicYear.upsert({
    where: { code: 'DEMO-2026-2027' },
    update: {
      name: 'السنة الدراسية التجريبية 2026-2027',
      status: AcademicYearStatus.ACTIVE,
      isCurrent: true,
      startDate: asUtcDate('2030-09-01'),
      endDate: asUtcDate('2031-06-30'),
      deletedAt: null,
      updatedById: null,
    },
    create: {
      code: 'DEMO-2026-2027',
      name: 'السنة الدراسية التجريبية 2026-2027',
      status: AcademicYearStatus.ACTIVE,
      isCurrent: true,
      startDate: asUtcDate('2030-09-01'),
      endDate: asUtcDate('2031-06-30'),
    },
  });

  const academicTerm = await prisma.academicTerm.upsert({
    where: {
      academicYearId_code: {
        academicYearId: academicYear.id,
        code: 'DEMO-T1',
      },
    },
    update: {
      name: 'الفصل الأول التجريبي',
      termType: AcademicTermType.SEMESTER,
      sequence: 1,
      startDate: asUtcDate('2030-09-01'),
      endDate: asUtcDate('2031-01-31'),
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      academicYearId: academicYear.id,
      code: 'DEMO-T1',
      name: 'الفصل الأول التجريبي',
      termType: AcademicTermType.SEMESTER,
      sequence: 1,
      startDate: asUtcDate('2030-09-01'),
      endDate: asUtcDate('2031-01-31'),
      isActive: true,
    },
  });

  const gradeLevel = await prisma.gradeLevel.upsert({
    where: { code: 'DEMO-G1' },
    update: {
      name: 'الصف الأول التجريبي',
      stage: GradeStage.PRIMARY,
      sequence: 1,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      code: 'DEMO-G1',
      name: 'الصف الأول التجريبي',
      stage: GradeStage.PRIMARY,
      sequence: 1,
      isActive: true,
    },
  });

  const section = await prisma.section.upsert({
    where: {
      gradeLevelId_code: {
        gradeLevelId: gradeLevel.id,
        code: 'A',
      },
    },
    update: {
      name: 'الشعبة A',
      capacity: 35,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      gradeLevelId: gradeLevel.id,
      code: 'A',
      name: 'الشعبة A',
      capacity: 35,
      isActive: true,
    },
  });

  await prisma.subject.upsert({
    where: { code: 'DEMO-MATH' },
    update: {
      name: 'رياضيات',
      shortName: 'رياضي',
      category: SubjectCategory.MATHEMATICS,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      code: 'DEMO-MATH',
      name: 'رياضيات',
      shortName: 'رياضي',
      category: SubjectCategory.MATHEMATICS,
      isActive: true,
    },
  });

  const defaultNationalIdType = await prisma.lookupIdType.findUnique({
    where: { code: 'NATIONAL_ID' },
    select: { id: true },
  });

  const defaultBloodType = await prisma.lookupBloodType.findUnique({
    where: { name: 'O+' },
    select: { id: true },
  });

  const employee = await prisma.employee.upsert({
    where: { jobNumber: 'DEMO-EMP-0001' },
    update: {
      fullName: 'معلم تجريبي',
      gender: EmployeeGender.MALE,
      idNumber: '1000000001',
      idTypeId: defaultNationalIdType?.id ?? null,
      systemAccessStatus: EmployeeSystemAccessStatus.GRANTED,
      jobTitle: 'معلم رياضيات',
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      jobNumber: 'DEMO-EMP-0001',
      fullName: 'معلم تجريبي',
      gender: EmployeeGender.MALE,
      idNumber: '1000000001',
      idTypeId: defaultNationalIdType?.id ?? null,
      systemAccessStatus: EmployeeSystemAccessStatus.GRANTED,
      jobTitle: 'معلم رياضيات',
      isActive: true,
    },
  });

  const student = await prisma.student.upsert({
    where: { admissionNo: 'DEMO-STU-0001' },
    update: {
      fullName: 'طالب تجريبي',
      gender: StudentGender.MALE,
      bloodTypeId: defaultBloodType?.id ?? null,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      admissionNo: 'DEMO-STU-0001',
      fullName: 'طالب تجريبي',
      gender: StudentGender.MALE,
      bloodTypeId: defaultBloodType?.id ?? null,
      isActive: true,
    },
  });

  let guardian = await prisma.guardian.findFirst({
    where: {
      fullName: 'ولي أمر تجريبي',
      deletedAt: null,
    },
  });

  if (!guardian) {
    guardian = await prisma.guardian.create({
      data: {
        fullName: 'ولي أمر تجريبي',
        gender: StudentGender.MALE,
        phonePrimary: '777000111',
        idNumber: '1000000002',
        idTypeId: defaultNationalIdType?.id ?? null,
        isActive: true,
      },
    });
  } else {
    guardian = await prisma.guardian.update({
      where: { id: guardian.id },
      data: {
        idNumber: '1000000002',
        idTypeId: defaultNationalIdType?.id ?? null,
        deletedAt: null,
        updatedById: null,
      },
    });
  }

  await prisma.studentGuardian.upsert({
    where: {
      studentId_guardianId_relationship: {
        studentId: student.id,
        guardianId: guardian.id,
        relationship: GuardianRelationship.FATHER,
      },
    },
    update: {
      isPrimary: true,
      canReceiveNotifications: true,
      canPickup: true,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      studentId: student.id,
      guardianId: guardian.id,
      relationship: GuardianRelationship.FATHER,
      isPrimary: true,
      canReceiveNotifications: true,
      canPickup: true,
      isActive: true,
    },
  });

  await prisma.studentEnrollment.upsert({
    where: {
      studentId_academicYearId: {
        studentId: student.id,
        academicYearId: academicYear.id,
      },
    },
    update: {
      sectionId: section.id,
      enrollmentDate: asUtcDate('2030-09-01'),
      status: StudentEnrollmentStatus.ACTIVE,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      studentId: student.id,
      academicYearId: academicYear.id,
      sectionId: section.id,
      enrollmentDate: asUtcDate('2030-09-01'),
      status: StudentEnrollmentStatus.ACTIVE,
      isActive: true,
    },
  });

  const morningPeriod = await prisma.lookupPeriod.findUnique({
    where: { code: 'MORNING' },
    select: { id: true },
  });

  if (morningPeriod) {
    const timetableTemplate = await prisma.timetableTemplate.upsert({
      where: {
        academicTermId_sectionId_name: {
          academicTermId: academicTerm.id,
          sectionId: section.id,
          name: 'القالب الصباحي الأساسي',
        },
      },
      update: {
        isDefault: true,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        academicTermId: academicTerm.id,
        sectionId: section.id,
        name: 'القالب الصباحي الأساسي',
        isDefault: true,
        isActive: true,
      },
    });

    await prisma.timetableTemplateSlot.upsert({
      where: {
        timetableTemplateId_dayOfWeek_periodOrder: {
          timetableTemplateId: timetableTemplate.id,
          dayOfWeek: TimetableDay.SUNDAY,
          periodOrder: 1,
        },
      },
      update: {
        lookupPeriodId: morningPeriod.id,
        startTime: '08:00',
        endTime: '08:45',
        isBreak: false,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        timetableTemplateId: timetableTemplate.id,
        lookupPeriodId: morningPeriod.id,
        dayOfWeek: TimetableDay.SUNDAY,
        periodOrder: 1,
        startTime: '08:00',
        endTime: '08:45',
        isBreak: false,
        isActive: true,
      },
    });
  }

  console.log('Demo seed completed');
  console.log(`Academic year: ${academicYear.code}`);
  console.log(`Section: ${section.code}`);
  console.log(`Employee: ${employee.jobNumber ?? employee.id}`);
  console.log(`Student: ${student.admissionNo ?? student.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
