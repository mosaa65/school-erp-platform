export type EmployeeFixture = {
  id: string;
  fullName: string;
  jobNumber: string;
  jobTitle: string;
};

export type TalentFixture = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type AcademicYearFixture = {
  id: string;
  code: string;
  name: string;
  status: string;
  isCurrent: boolean;
};

export type AcademicTermFixture = {
  id: string;
  academicYearId: string;
  code: string;
  name: string;
  sequence: number;
  termType: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type GradeLevelFixture = {
  id: string;
  code: string;
  name: string;
  stage: string;
  sequence: number;
  isActive: boolean;
};

export type SubjectFixture = {
  id: string;
  code: string;
  name: string;
  category: string;
  isActive: boolean;
};

export type SectionFixture = {
  id: string;
  code: string;
  name: string;
  gradeLevelId: string;
  isActive: boolean;
};

const EMPLOYEE_POOL: EmployeeFixture[] = [
  {
    id: "emp-1",
    fullName: "Ahmed Ali",
    jobNumber: "EMP-001",
    jobTitle: "Math Teacher",
  },
  {
    id: "emp-2",
    fullName: "Sara Omar",
    jobNumber: "EMP-002",
    jobTitle: "Supervisor",
  },
  {
    id: "emp-3",
    fullName: "Mona Khaled",
    jobNumber: "EMP-003",
    jobTitle: "Science Teacher",
  },
];

const TALENT_POOL: TalentFixture[] = [
  {
    id: "tal-1",
    code: "TAL-CALL",
    name: "Calligraphy",
    isActive: true,
  },
  {
    id: "tal-2",
    code: "TAL-ROBO",
    name: "Robotics Coach",
    isActive: true,
  },
];

const ACADEMIC_YEAR_POOL: AcademicYearFixture[] = [
  {
    id: "year-1",
    code: "2025-2026",
    name: "Academic Year 2025/2026",
    status: "ACTIVE",
    isCurrent: true,
  },
];

const ACADEMIC_TERM_POOL: AcademicTermFixture[] = [
  {
    id: "term-1",
    academicYearId: "year-1",
    code: "T1",
    name: "Term 1",
    sequence: 1,
    termType: "SEMESTER",
    startDate: "2025-09-01T00:00:00.000Z",
    endDate: "2026-01-15T23:59:59.000Z",
    isActive: true,
  },
  {
    id: "term-2",
    academicYearId: "year-1",
    code: "T2",
    name: "Term 2",
    sequence: 2,
    termType: "SEMESTER",
    startDate: "2026-01-16T00:00:00.000Z",
    endDate: "2026-06-30T23:59:59.000Z",
    isActive: true,
  },
];

const GRADE_LEVEL_POOL: GradeLevelFixture[] = [
  {
    id: "grade-1",
    code: "G1",
    name: "Grade 1",
    stage: "PRIMARY",
    sequence: 1,
    isActive: true,
  },
  {
    id: "grade-2",
    code: "G2",
    name: "Grade 2",
    stage: "PRIMARY",
    sequence: 2,
    isActive: true,
  },
];

const SUBJECT_POOL: SubjectFixture[] = [
  {
    id: "subj-1",
    code: "MATH",
    name: "Mathematics",
    category: "MATHEMATICS",
    isActive: true,
  },
  {
    id: "subj-2",
    code: "SCI",
    name: "Science",
    category: "SCIENCE",
    isActive: true,
  },
];

const SECTION_POOL: SectionFixture[] = [
  {
    id: "sec-1",
    code: "A",
    name: "Section A",
    gradeLevelId: "grade-1",
    isActive: true,
  },
  {
    id: "sec-2",
    code: "B",
    name: "Section B",
    gradeLevelId: "grade-1",
    isActive: true,
  },
];

function clampCount(count: number, max: number): number {
  return Math.max(0, Math.min(count, max));
}

export function buildEmployeeFixtures(count = 2): EmployeeFixture[] {
  const safeCount = clampCount(count, EMPLOYEE_POOL.length);
  return EMPLOYEE_POOL.slice(0, safeCount).map((employee) => ({ ...employee }));
}

export function buildTalentFixtures(count = 2): TalentFixture[] {
  const safeCount = clampCount(count, TALENT_POOL.length);
  return TALENT_POOL.slice(0, safeCount).map((talent) => ({ ...talent }));
}

export function buildAcademicYearFixtures(count = 1): AcademicYearFixture[] {
  const safeCount = clampCount(count, ACADEMIC_YEAR_POOL.length);
  return ACADEMIC_YEAR_POOL.slice(0, safeCount).map((year) => ({ ...year }));
}

export function buildAcademicTermFixtures(count = 1): AcademicTermFixture[] {
  const safeCount = clampCount(count, ACADEMIC_TERM_POOL.length);
  return ACADEMIC_TERM_POOL.slice(0, safeCount).map((term) => ({ ...term }));
}

export function buildGradeLevelFixtures(count = 1): GradeLevelFixture[] {
  const safeCount = clampCount(count, GRADE_LEVEL_POOL.length);
  return GRADE_LEVEL_POOL.slice(0, safeCount).map((grade) => ({ ...grade }));
}

export function buildSubjectFixtures(count = 1): SubjectFixture[] {
  const safeCount = clampCount(count, SUBJECT_POOL.length);
  return SUBJECT_POOL.slice(0, safeCount).map((subject) => ({ ...subject }));
}

export function buildSectionFixtures(count = 1): SectionFixture[] {
  const safeCount = clampCount(count, SECTION_POOL.length);
  return SECTION_POOL.slice(0, safeCount).map((section) => ({ ...section }));
}
