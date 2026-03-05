import { AcademicTermType, AcademicYearStatus, GradeStage, type PrismaClient } from '@prisma/client';
import { asUtcDate } from './utils';

export type DemoAcademicFoundation = {
  academicYearId: string;
  academicYearCode: string;
  academicTermId: string;
  sectionId: string;
  sectionCode: string;
};

export async function seedDemoAcademicFoundation(
  prisma: PrismaClient,
): Promise<DemoAcademicFoundation> {
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
      // Keep demo grade level away from core stage/sequence range to avoid unique collisions.
      sequence: 99,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      code: 'DEMO-G1',
      name: 'الصف الأول التجريبي',
      stage: GradeStage.PRIMARY,
      sequence: 99,
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

  return {
    academicYearId: academicYear.id,
    academicYearCode: academicYear.code,
    academicTermId: academicTerm.id,
    sectionId: section.id,
    sectionCode: section.code,
  };
}
