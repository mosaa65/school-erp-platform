import {
  AcademicTermType,
  AcademicYearStatus,
  type PrismaClient,
} from '@prisma/client';
import { asUtcDate } from './utils';

type DemoTargetSection = {
  id: string;
  code: string;
  name: string;
  gradeLevelId: string;
  gradeLevelCode: string;
  gradeLevelName: string;
  gradeLevelSequence: number;
};

export type DemoAcademicFoundation = {
  academicYearId: string;
  academicYearCode: string;
  academicYearName: string;
  academicTermIds: {
    T1: string;
    T2: string;
  };
  targetSections: DemoTargetSection[];
};

const CORE_ACADEMIC_YEAR_CODE = 'AY-2026-2027-1448H';
const TARGET_GRADE_LEVEL_CODES = ['grade-01', 'grade-07', 'grade-10'];
const TARGET_SECTION_CODES = ['A', 'B'];

export async function seedDemoAcademicFoundation(
  prisma: PrismaClient,
): Promise<DemoAcademicFoundation> {
  const academicYear = await prisma.academicYear.upsert({
    where: { code: CORE_ACADEMIC_YEAR_CODE },
    update: {
      name: 'السنة الدراسية 2026-2027 / 1448هـ',
      status: AcademicYearStatus.ACTIVE,
      isCurrent: true,
      startDate: asUtcDate('2026-08-15'),
      endDate: asUtcDate('2027-04-14'),
      deletedAt: null,
      updatedById: null,
    },
    create: {
      code: CORE_ACADEMIC_YEAR_CODE,
      name: 'السنة الدراسية 2026-2027 / 1448هـ',
      status: AcademicYearStatus.ACTIVE,
      isCurrent: true,
      startDate: asUtcDate('2026-08-15'),
      endDate: asUtcDate('2027-04-14'),
    },
  });

  const term1 = await prisma.academicTerm.upsert({
    where: {
      academicYearId_code: {
        academicYearId: academicYear.id,
        code: 'T1',
      },
    },
    update: {
      name: 'الفصل الدراسي الأول',
      termType: AcademicTermType.SEMESTER,
      sequence: 1,
      startDate: asUtcDate('2026-08-15'),
      endDate: asUtcDate('2026-12-14'),
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      academicYearId: academicYear.id,
      code: 'T1',
      name: 'الفصل الدراسي الأول',
      termType: AcademicTermType.SEMESTER,
      sequence: 1,
      startDate: asUtcDate('2026-08-15'),
      endDate: asUtcDate('2026-12-14'),
      isActive: true,
    },
  });

  const term2 = await prisma.academicTerm.upsert({
    where: {
      academicYearId_code: {
        academicYearId: academicYear.id,
        code: 'T2',
      },
    },
    update: {
      name: 'الفصل الدراسي الثاني',
      termType: AcademicTermType.SEMESTER,
      sequence: 2,
      startDate: asUtcDate('2026-12-15'),
      endDate: asUtcDate('2027-04-14'),
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      academicYearId: academicYear.id,
      code: 'T2',
      name: 'الفصل الدراسي الثاني',
      termType: AcademicTermType.SEMESTER,
      sequence: 2,
      startDate: asUtcDate('2026-12-15'),
      endDate: asUtcDate('2027-04-14'),
      isActive: true,
    },
  });

  const sections = await prisma.section.findMany({
    where: {
      code: {
        in: TARGET_SECTION_CODES,
      },
      isActive: true,
      deletedAt: null,
      gradeLevel: {
        code: {
          in: TARGET_GRADE_LEVEL_CODES,
        },
        isActive: true,
        deletedAt: null,
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
      gradeLevelId: true,
      gradeLevel: {
        select: {
          code: true,
          name: true,
          sequence: true,
        },
      },
    },
    orderBy: [
      {
        gradeLevel: {
          sequence: 'asc',
        },
      },
      {
        code: 'asc',
      },
    ],
  });

  const expectedCount = TARGET_GRADE_LEVEL_CODES.length * TARGET_SECTION_CODES.length;

  if (sections.length < expectedCount) {
    const foundPairs = new Set(
      sections.map((item) => `${item.gradeLevel.code}|${item.code}`),
    );
    const missingPairs: string[] = [];

    for (const gradeCode of TARGET_GRADE_LEVEL_CODES) {
      for (const sectionCode of TARGET_SECTION_CODES) {
        const pair = `${gradeCode}|${sectionCode}`;
        if (!foundPairs.has(pair)) {
          missingPairs.push(pair);
        }
      }
    }

    throw new Error(
      `Missing target sections for demo seed: ${missingPairs.join(', ')}`,
    );
  }

  const targetSections: DemoTargetSection[] = sections.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    gradeLevelId: item.gradeLevelId,
    gradeLevelCode: item.gradeLevel.code,
    gradeLevelName: item.gradeLevel.name,
    gradeLevelSequence: item.gradeLevel.sequence,
  }));

  return {
    academicYearId: academicYear.id,
    academicYearCode: academicYear.code,
    academicYearName: academicYear.name,
    academicTermIds: {
      T1: term1.id,
      T2: term2.id,
    },
    targetSections,
  };
}
