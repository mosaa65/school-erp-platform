import {
  AcademicTermType,
  AcademicYearStatus,
  GradeStage,
  SubjectCategory,
  type PrismaClient,
} from '@prisma/client';

type GradeLevelSeedItem = {
  code: string;
  name: string;
  stage: GradeStage;
  sequence: number;
};

type SubjectSeedItem = {
  code: string;
  name: string;
  shortName: string;
  category: SubjectCategory;
};

type AcademicTermSeedItem = {
  code: string;
  name: string;
  sequence: number;
  startDate: string;
  endDate: string;
};

type AcademicMonthSeedItem = {
  termCode: string;
  code: string;
  name: string;
  sequence: number;
  startDate: string;
  endDate: string;
};

type SectionSeedItem = {
  code: string;
  name: string;
  capacity: number;
};

const CORE_ACADEMIC_YEAR = {
  code: 'AY-2026-2027-1448H',
  name: 'السنة الدراسية 2026-2027 / 1448هـ',
  startDate: '2026-08-15',
  endDate: '2027-04-14',
};

const CORE_ACADEMIC_TERMS: AcademicTermSeedItem[] = [
  {
    code: 'T1',
    name: 'الفصل الدراسي الأول',
    sequence: 1,
    startDate: '2026-08-15',
    endDate: '2026-12-14',
  },
  {
    code: 'T2',
    name: 'الفصل الدراسي الثاني',
    sequence: 2,
    startDate: '2026-12-15',
    endDate: '2027-04-14',
  },
];

const CORE_ACADEMIC_MONTHS: AcademicMonthSeedItem[] = [
  {
    termCode: 'T1',
    code: 'MUHARRAM',
    name: 'محرم',
    sequence: 1,
    startDate: '2026-08-15',
    endDate: '2026-09-13',
  },
  {
    termCode: 'T1',
    code: 'SAFAR',
    name: 'صفر',
    sequence: 2,
    startDate: '2026-09-14',
    endDate: '2026-10-13',
  },
  {
    termCode: 'T1',
    code: 'RABI_I',
    name: 'ربيع الأول',
    sequence: 3,
    startDate: '2026-10-14',
    endDate: '2026-11-12',
  },
  {
    termCode: 'T1',
    code: 'RABI_II',
    name: 'ربيع الآخر',
    sequence: 4,
    startDate: '2026-11-13',
    endDate: '2026-12-14',
  },
  {
    termCode: 'T2',
    code: 'JUMADA_I',
    name: 'جمادى الأولى',
    sequence: 1,
    startDate: '2026-12-15',
    endDate: '2027-01-13',
  },
  {
    termCode: 'T2',
    code: 'JUMADA_II',
    name: 'جمادى الآخرة',
    sequence: 2,
    startDate: '2027-01-14',
    endDate: '2027-02-12',
  },
  {
    termCode: 'T2',
    code: 'RAJAB',
    name: 'رجب',
    sequence: 3,
    startDate: '2027-02-13',
    endDate: '2027-03-13',
  },
  {
    termCode: 'T2',
    code: 'SHAABAN',
    name: 'شعبان',
    sequence: 4,
    startDate: '2027-03-14',
    endDate: '2027-04-14',
  },
];

const DEFAULT_GRADE_LEVELS: GradeLevelSeedItem[] = [
  {
    code: 'grade-01',
    name: 'الصف الأول',
    stage: GradeStage.PRIMARY,
    sequence: 1,
  },
  {
    code: 'grade-02',
    name: 'الصف الثاني',
    stage: GradeStage.PRIMARY,
    sequence: 2,
  },
  {
    code: 'grade-03',
    name: 'الصف الثالث',
    stage: GradeStage.PRIMARY,
    sequence: 3,
  },
  {
    code: 'grade-04',
    name: 'الصف الرابع',
    stage: GradeStage.PRIMARY,
    sequence: 4,
  },
  {
    code: 'grade-05',
    name: 'الصف الخامس',
    stage: GradeStage.PRIMARY,
    sequence: 5,
  },
  {
    code: 'grade-06',
    name: 'الصف السادس',
    stage: GradeStage.PRIMARY,
    sequence: 6,
  },
  {
    code: 'grade-07',
    name: 'الصف السابع',
    stage: GradeStage.MIDDLE,
    sequence: 7,
  },
  {
    code: 'grade-08',
    name: 'الصف الثامن',
    stage: GradeStage.MIDDLE,
    sequence: 8,
  },
  {
    code: 'grade-09',
    name: 'الصف التاسع',
    stage: GradeStage.MIDDLE,
    sequence: 9,
  },
  {
    code: 'grade-10',
    name: 'الصف الأول الثانوي',
    stage: GradeStage.HIGH,
    sequence: 10,
  },
  {
    code: 'grade-11',
    name: 'الصف الثاني الثانوي',
    stage: GradeStage.HIGH,
    sequence: 11,
  },
  {
    code: 'grade-12',
    name: 'الصف الثالث الثانوي',
    stage: GradeStage.HIGH,
    sequence: 12,
  },
];

const DEFAULT_SUBJECTS: SubjectSeedItem[] = [
  {
    code: 'quran',
    name: 'القرآن الكريم',
    shortName: 'QURAN',
    category: SubjectCategory.HUMANITIES,
  },
  {
    code: 'isl',
    name: 'التربية الإسلامية',
    shortName: 'ISL',
    category: SubjectCategory.HUMANITIES,
  },
  {
    code: 'arb',
    name: 'اللغة العربية',
    shortName: 'ARB',
    category: SubjectCategory.LANGUAGE,
  },
  {
    code: 'eng',
    name: 'اللغة الإنجليزية',
    shortName: 'ENG',
    category: SubjectCategory.LANGUAGE,
  },
  {
    code: 'math',
    name: 'الرياضيات',
    shortName: 'MATH',
    category: SubjectCategory.MATHEMATICS,
  },
  {
    code: 'sci',
    name: 'العلوم',
    shortName: 'SCI',
    category: SubjectCategory.SCIENCE,
  },
  {
    code: 'phy',
    name: 'الفيزياء',
    shortName: 'PHY',
    category: SubjectCategory.SCIENCE,
  },
  {
    code: 'chm',
    name: 'الكيمياء',
    shortName: 'CHM',
    category: SubjectCategory.SCIENCE,
  },
  {
    code: 'bio',
    name: 'الأحياء',
    shortName: 'BIO',
    category: SubjectCategory.SCIENCE,
  },
  {
    code: 'soc',
    name: 'الدراسات الاجتماعية',
    shortName: 'SOC',
    category: SubjectCategory.HUMANITIES,
  },
  {
    code: 'his',
    name: 'التاريخ',
    shortName: 'HIS',
    category: SubjectCategory.HUMANITIES,
  },
  {
    code: 'geo',
    name: 'الجغرافيا',
    shortName: 'GEO',
    category: SubjectCategory.HUMANITIES,
  },
  {
    code: 'nat',
    name: 'التربية الوطنية',
    shortName: 'NAT',
    category: SubjectCategory.HUMANITIES,
  },
  {
    code: 'cs',
    name: 'الحاسوب',
    shortName: 'CS',
    category: SubjectCategory.TECHNOLOGY,
  },
  {
    code: 'art',
    name: 'التربية الفنية',
    shortName: 'ART',
    category: SubjectCategory.ARTS,
  },
  {
    code: 'pe',
    name: 'التربية الرياضية',
    shortName: 'PE',
    category: SubjectCategory.SPORTS,
  },
];

const DEFAULT_SECTIONS: SectionSeedItem[] = [
  { code: 'A', name: 'الشعبة أ', capacity: 40 },
  { code: 'B', name: 'الشعبة ب', capacity: 40 },
];

const OPTIONAL_SUBJECT_CODES = new Set(['art', 'pe']);

const WEEKLY_PERIODS_BY_SUBJECT: Record<string, number> = {
  quran: 2,
  isl: 2,
  arb: 5,
  eng: 4,
  math: 5,
  sci: 4,
  phy: 3,
  chm: 3,
  bio: 3,
  soc: 2,
  his: 2,
  geo: 2,
  nat: 1,
  cs: 1,
  art: 1,
  pe: 1,
};

function asUtcDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`);
}

function getSubjectCodesForGradeSequence(sequence: number): string[] {
  if (sequence <= 3) {
    return ['quran', 'isl', 'arb', 'math', 'sci', 'art', 'pe'];
  }

  if (sequence <= 6) {
    return ['quran', 'isl', 'arb', 'eng', 'math', 'sci', 'soc', 'art', 'pe'];
  }

  if (sequence <= 9) {
    return [
      'quran',
      'isl',
      'arb',
      'eng',
      'math',
      'sci',
      'soc',
      'nat',
      'cs',
      'art',
      'pe',
    ];
  }

  return [
    'quran',
    'isl',
    'arb',
    'eng',
    'math',
    'phy',
    'chm',
    'bio',
    'his',
    'geo',
    'nat',
    'cs',
  ];
}

async function deactivateDemoAcademicArtifacts(prisma: PrismaClient) {
  const now = new Date();

  await prisma.academicTerm.updateMany({
    where: {
      code: {
        startsWith: 'DEMO-',
      },
      deletedAt: null,
    },
    data: {
      isActive: false,
      deletedAt: now,
      updatedById: null,
    },
  });

  await prisma.academicYear.updateMany({
    where: {
      code: {
        startsWith: 'DEMO-',
      },
      deletedAt: null,
    },
    data: {
      isCurrent: false,
      deletedAt: now,
      updatedById: null,
    },
  });

  await prisma.section.updateMany({
    where: {
      gradeLevel: {
        code: {
          startsWith: 'DEMO-',
        },
      },
      deletedAt: null,
    },
    data: {
      isActive: false,
      deletedAt: now,
      updatedById: null,
    },
  });

  await prisma.gradeLevel.updateMany({
    where: {
      code: {
        startsWith: 'DEMO-',
      },
      deletedAt: null,
    },
    data: {
      isActive: false,
      deletedAt: now,
      updatedById: null,
    },
  });

  await prisma.subject.updateMany({
    where: {
      code: {
        startsWith: 'DEMO-',
      },
      deletedAt: null,
    },
    data: {
      isActive: false,
      deletedAt: now,
      updatedById: null,
    },
  });
}

export async function seedSystem02AcademicCore(prisma: PrismaClient) {
  await deactivateDemoAcademicArtifacts(prisma);

  for (const item of DEFAULT_GRADE_LEVELS) {
    await prisma.gradeLevel.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        stage: item.stage,
        sequence: item.sequence,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        name: item.name,
        stage: item.stage,
        sequence: item.sequence,
        isActive: true,
      },
    });
  }

  for (const item of DEFAULT_SUBJECTS) {
    await prisma.subject.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        shortName: item.shortName,
        category: item.category,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        name: item.name,
        shortName: item.shortName,
        category: item.category,
        isActive: true,
      },
    });
  }

  const academicYear = await prisma.academicYear.upsert({
    where: {
      code: CORE_ACADEMIC_YEAR.code,
    },
    update: {
      name: CORE_ACADEMIC_YEAR.name,
      startDate: asUtcDate(CORE_ACADEMIC_YEAR.startDate),
      endDate: asUtcDate(CORE_ACADEMIC_YEAR.endDate),
      status: AcademicYearStatus.ACTIVE,
      isCurrent: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      code: CORE_ACADEMIC_YEAR.code,
      name: CORE_ACADEMIC_YEAR.name,
      startDate: asUtcDate(CORE_ACADEMIC_YEAR.startDate),
      endDate: asUtcDate(CORE_ACADEMIC_YEAR.endDate),
      status: AcademicYearStatus.ACTIVE,
      isCurrent: true,
    },
  });

  await prisma.academicYear.updateMany({
    where: {
      id: {
        not: academicYear.id,
      },
      isCurrent: true,
      deletedAt: null,
    },
    data: {
      isCurrent: false,
      updatedById: null,
    },
  });

  const termByCode = new Map<string, { id: string; code: string }>();

  for (const term of CORE_ACADEMIC_TERMS) {
    const record = await prisma.academicTerm.upsert({
      where: {
        academicYearId_code: {
          academicYearId: academicYear.id,
          code: term.code,
        },
      },
      update: {
        name: term.name,
        termType: AcademicTermType.SEMESTER,
        sequence: term.sequence,
        startDate: asUtcDate(term.startDate),
        endDate: asUtcDate(term.endDate),
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        academicYearId: academicYear.id,
        code: term.code,
        name: term.name,
        termType: AcademicTermType.SEMESTER,
        sequence: term.sequence,
        startDate: asUtcDate(term.startDate),
        endDate: asUtcDate(term.endDate),
        isActive: true,
      },
      select: {
        id: true,
        code: true,
      },
    });

    termByCode.set(record.code, record);
  }

  for (const month of CORE_ACADEMIC_MONTHS) {
    const term = termByCode.get(month.termCode);

    if (!term) {
      continue;
    }

    await prisma.academicMonth.upsert({
      where: {
        academicTermId_code: {
          academicTermId: term.id,
          code: month.code,
        },
      },
      update: {
        academicYearId: academicYear.id,
        name: month.name,
        sequence: month.sequence,
        startDate: asUtcDate(month.startDate),
        endDate: asUtcDate(month.endDate),
        isCurrent: false,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        academicYearId: academicYear.id,
        academicTermId: term.id,
        code: month.code,
        name: month.name,
        sequence: month.sequence,
        startDate: asUtcDate(month.startDate),
        endDate: asUtcDate(month.endDate),
        isCurrent: false,
        isActive: true,
      },
    });
  }

  const gradeLevels = await prisma.gradeLevel.findMany({
    where: {
      code: {
        in: DEFAULT_GRADE_LEVELS.map((item) => item.code),
      },
      deletedAt: null,
    },
    select: {
      id: true,
      code: true,
      sequence: true,
    },
    orderBy: {
      sequence: 'asc',
    },
  });

  for (const gradeLevel of gradeLevels) {
    for (const section of DEFAULT_SECTIONS) {
      await prisma.section.upsert({
        where: {
          gradeLevelId_code: {
            gradeLevelId: gradeLevel.id,
            code: section.code,
          },
        },
        update: {
          name: section.name,
          capacity: section.capacity,
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
        create: {
          gradeLevelId: gradeLevel.id,
          code: section.code,
          name: section.name,
          capacity: section.capacity,
          isActive: true,
        },
      });
    }
  }

  const subjects = await prisma.subject.findMany({
    where: {
      code: {
        in: DEFAULT_SUBJECTS.map((item) => item.code),
      },
      deletedAt: null,
    },
    select: {
      id: true,
      code: true,
    },
  });

  const subjectIdByCode = new Map(subjects.map((item) => [item.code, item.id]));
  const desiredGradeLevelSubjectKeys = new Set<string>();

  for (const gradeLevel of gradeLevels) {
    const subjectCodes = getSubjectCodesForGradeSequence(gradeLevel.sequence);

    for (const [index, subjectCode] of subjectCodes.entries()) {
      const subjectId = subjectIdByCode.get(subjectCode);

      if (!subjectId) {
        continue;
      }

      desiredGradeLevelSubjectKeys.add(`${gradeLevel.id}|${subjectId}`);

      await prisma.gradeLevelSubject.upsert({
        where: {
          academicYearId_gradeLevelId_subjectId: {
            academicYearId: academicYear.id,
            gradeLevelId: gradeLevel.id,
            subjectId,
          },
        },
        update: {
          isMandatory: !OPTIONAL_SUBJECT_CODES.has(subjectCode),
          weeklyPeriods: WEEKLY_PERIODS_BY_SUBJECT[subjectCode] ?? 1,
          displayOrder: index + 1,
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
        create: {
          academicYearId: academicYear.id,
          gradeLevelId: gradeLevel.id,
          subjectId,
          isMandatory: !OPTIONAL_SUBJECT_CODES.has(subjectCode),
          weeklyPeriods: WEEKLY_PERIODS_BY_SUBJECT[subjectCode] ?? 1,
          displayOrder: index + 1,
          isActive: true,
        },
      });
    }
  }

  const existingGradeLevelSubjects = await prisma.gradeLevelSubject.findMany({
    where: {
      academicYearId: academicYear.id,
      deletedAt: null,
    },
    select: {
      id: true,
      gradeLevelId: true,
      subjectId: true,
    },
  });

  for (const item of existingGradeLevelSubjects) {
    const key = `${item.gradeLevelId}|${item.subjectId}`;

    if (desiredGradeLevelSubjectKeys.has(key)) {
      continue;
    }

    await prisma.gradeLevelSubject.update({
      where: {
        id: item.id,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: null,
      },
    });
  }

  const activeGradeLevelSubjects = await prisma.gradeLevelSubject.findMany({
    where: {
      academicYearId: academicYear.id,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      weeklyPeriods: true,
      displayOrder: true,
      gradeLevel: {
        select: {
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
        displayOrder: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
  });

  for (const term of termByCode.values()) {
    for (const item of activeGradeLevelSubjects) {
      await prisma.termSubjectOffering.upsert({
        where: {
          academicTermId_gradeLevelSubjectId: {
            academicTermId: term.id,
            gradeLevelSubjectId: item.id,
          },
        },
        update: {
          weeklyPeriods: item.weeklyPeriods,
          displayOrder: item.displayOrder,
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
        create: {
          academicTermId: term.id,
          gradeLevelSubjectId: item.id,
          weeklyPeriods: item.weeklyPeriods,
          displayOrder: item.displayOrder,
          isActive: true,
        },
      });
    }
  }
}
