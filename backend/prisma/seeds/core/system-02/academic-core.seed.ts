import { GradeStage, SubjectCategory, type PrismaClient } from '@prisma/client';

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

export async function seedSystem02AcademicCore(prisma: PrismaClient) {
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
}
