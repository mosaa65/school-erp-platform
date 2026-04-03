import type {
  AcademicTermFixture,
  AcademicYearFixture,
  EmployeeFixture,
  GradeLevelFixture,
  SubjectFixture,
  TalentFixture,
} from "./fixtures";

type JsonObject = Record<string, unknown>;

export type EmployeeCourseListItem = {
  id: string;
  employeeId: string;
  courseName: string;
  courseProvider: string | null;
  courseDate: string | null;
  durationDays: number | null;
  certificateNumber: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: EmployeeFixture;
};

export type EmployeeContractListItem = {
  id: string;
  employeeId: string;
  contractTitle: string;
  contractNumber: string | null;
  contractStartDate: string;
  contractEndDate: string | null;
  salaryAmount: string | null;
  notes: string | null;
  isCurrent: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: EmployeeFixture;
};

export type EmployeeDocumentListItem = {
  id: string;
  employeeId: string;
  fileName: string;
  filePath: string;
  fileType: string | null;
  fileSize: number | null;
  fileCategory: string | null;
  description: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee: EmployeeFixture | null;
};

export type EmployeeLeaveListItem = {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  reason: string | null;
  notes: string | null;
  approvedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: EmployeeFixture;
  approvedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
};

export type EmployeeLeaveBalanceListItem = {
  id: string;
  employeeId: string;
  leaveType: string;
  balanceYear: number;
  allocatedDays: number;
  carriedForwardDays: number;
  manualAdjustmentDays: number;
  totalEntitledDays: number;
  usedDays: number;
  remainingDays: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: EmployeeFixture;
};

export type EmployeeDepartmentListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    employees: number;
  };
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type EmployeeLifecycleChecklistListItem = {
  id: string;
  employeeId: string;
  checklistType: string;
  title: string;
  status: string;
  assignedToEmployeeId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: EmployeeFixture;
  assignedTo: EmployeeFixture | null;
};

export type EmployeeTalentMappingListItem = {
  id: string;
  employeeId: string;
  talentId: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: EmployeeFixture;
  talent: TalentFixture;
};

export type EmployeePerformanceEvaluationListItem = {
  id: string;
  employeeId: string;
  academicYearId: string;
  evaluationDate: string;
  score: number;
  ratingLevel: string;
  evaluatorEmployeeId: string | null;
  strengths: string | null;
  weaknesses: string | null;
  recommendations: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: EmployeeFixture;
  evaluator: EmployeeFixture;
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: string;
  };
};

export type EmployeeViolationListItem = {
  id: string;
  employeeId: string;
  violationDate: string;
  violationAspect: string;
  violationText: string;
  actionTaken: string;
  severity: string;
  hasWarning: boolean;
  hasMinutes: boolean;
  reportedByEmployeeId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: EmployeeFixture;
  reportedBy: EmployeeFixture;
};

export type TalentCatalogListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type AcademicMonthListItem = {
  id: string;
  academicYearId: string;
  academicTermId: string;
  code: string;
  name: string;
  sequence: number;
  startDate: string;
  endDate: string;
  status: string;
  isCurrent: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    monthlyGrades: number;
  };
  academicYear: AcademicYearFixture;
  academicTerm: {
    id: string;
    code: string;
    name: string;
    sequence: number;
    termType: string;
    isActive: boolean;
    startDate: string;
    endDate: string;
  };
};

export type GradingPolicyListItem = {
  id: string;
  academicYearId: string;
  gradeLevelId: string;
  subjectId: string;
  assessmentType: string;
  academicTermId: string | null;
  version: number;
  totalMaxScore: number;
  passingScore: number;
  isDefault: boolean;
  status: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  academicYear: AcademicYearFixture;
  gradeLevel: GradeLevelFixture;
  subject: SubjectFixture;
  components: Array<{
    id: string;
    gradingPolicyId: string;
    code: string;
    name: string;
    maxScore: number;
    calculationMode: string;
    includeInMonthly: boolean;
    includeInSemester: boolean;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type GradingSummaryReportResponse = {
  generatedAt: string;
  scope: {
    academicYearId: string | null;
    gradeLevelId: string | null;
    sectionId: string | null;
    academicTermId: string | null;
    fromDate: string | null;
    toDate: string | null;
  };
  semesterGrades: {
    total: number;
    active: number;
    inactive: number;
    locked: number;
    unlocked: number;
    lockRate: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  annualGrades: {
    total: number;
    active: number;
    inactive: number;
    locked: number;
    unlocked: number;
    lockRate: number;
    byStatus: Array<{ status: string; count: number }>;
    byFinalStatus: Array<{
      finalStatusId: string;
      code: string;
      name: string;
      count: number;
    }>;
  };
  annualResults: {
    total: number;
    active: number;
    inactive: number;
    locked: number;
    unlocked: number;
    lockRate: number;
    byStatus: Array<{ status: string; count: number }>;
    byPromotionDecision: Array<{
      promotionDecisionId: string;
      code: string;
      name: string;
      count: number;
    }>;
  };
  rankingReadiness: {
    withClassRank: number;
    withGradeRank: number;
    fullyRanked: number;
    missingClassRank: number;
    missingGradeRank: number;
    notFullyRanked: number;
  };
};

export type GradingDetailedReportItem = {
  id: string;
  studentEnrollmentId: string;
  academicYearId: string;
  totalAllSubjects: number;
  maxPossibleTotal: number;
  percentage: number;
  rankInClass: number | null;
  rankInGrade: number | null;
  passedSubjectsCount: number;
  failedSubjectsCount: number;
  status: string;
  isLocked: boolean;
  isActive: boolean;
  calculatedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    admissionNo: string | null;
    fullName: string;
  };
  section: {
    id: string;
    code: string;
    name: string;
    gradeLevel: {
      id: string;
      code: string;
      name: string;
    };
  };
  gradeLevel: {
    id: string;
    code: string;
    name: string;
  };
  academicYear: {
    id: string;
    code: string;
    name: string;
  };
  promotionDecision: {
    id: string;
    code: string;
    name: string;
  };
  gradeDescription: {
    id: number;
    minPercentage: number;
    maxPercentage: number;
    nameAr: string;
    nameEn: string | null;
    colorCode: string | null;
    sortOrder: number;
  } | null;
};

export type HrSummaryReportResponse = {
  generatedAt: string;
  scope: {
    fromDate: string | null;
    toDate: string | null;
    employeeId: string | null;
  };
  employees: {
    total: number;
    active: number;
    inactive: number;
    withUserAccount: number;
    withoutUserAccount: number;
  };
  attendance: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
    indicators: {
      presentRate: number;
      absentRate: number;
      lateRate: number;
      excusedAbsenceRate: number;
      earlyLeaveRate: number;
    };
  };
  violations: {
    total: number;
    withWarning: number;
    bySeverity: Array<{ severity: string; count: number }>;
  };
  courses: {
    total: number;
  };
  workload: {
    activeTeachingAssignments: number;
    activeTasks: number;
  };
  performance: {
    totalEvaluations: number;
    byRating: Array<{ ratingLevel: string; count: number }>;
  };
  organization: {
    departmentDistribution: Array<{
      departmentId: string;
      departmentCode: string | null;
      departmentName: string;
      employeeCount: number;
    }>;
    unassignedEmployees: number;
  };
  compliance: {
    thresholdDays: number;
    incompleteProfiles: number;
    employeesWithoutDocuments: number;
    contractsExpiringSoon: number;
    contractsExpired: number;
    documentsExpiringSoon: number;
    documentsExpired: number;
    identitiesExpiringSoon: number;
    identitiesExpired: number;
  };
};

export function buildEmployeeCourseListItem(
  employee: EmployeeFixture,
  overrides: Partial<Omit<EmployeeCourseListItem, "employee">> = {},
): EmployeeCourseListItem {
  return {
    id: overrides.id ?? "course-1",
    employeeId: overrides.employeeId ?? employee.id,
    courseName: overrides.courseName ?? "Classroom Management",
    courseProvider: overrides.courseProvider ?? "MOE",
    courseDate: overrides.courseDate ?? "2026-01-10T00:00:00.000Z",
    durationDays: overrides.durationDays ?? 2,
    certificateNumber: overrides.certificateNumber ?? "CERT-100",
    notes: overrides.notes ?? "Completed successfully",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-01-10T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-10T00:00:00.000Z",
    employee,
  };
}

export function buildEmployeeContractListItem(
  employee: EmployeeFixture,
  overrides: Partial<Omit<EmployeeContractListItem, "employee">> = {},
): EmployeeContractListItem {
  return {
    id: overrides.id ?? "contract-1",
    employeeId: overrides.employeeId ?? employee.id,
    contractTitle: overrides.contractTitle ?? "Math Teacher Contract",
    contractNumber: overrides.contractNumber ?? "CNT-2026-001",
    contractStartDate: overrides.contractStartDate ?? "2026-01-01T00:00:00.000Z",
    contractEndDate: overrides.contractEndDate ?? "2026-12-31T23:59:59.000Z",
    salaryAmount: overrides.salaryAmount ?? "120000.00",
    notes: overrides.notes ?? "Renewable based on performance",
    isCurrent: overrides.isCurrent ?? true,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    employee,
  };
}

export function buildEmployeeDepartmentListItem(
  overrides: Partial<EmployeeDepartmentListItem> = {},
): EmployeeDepartmentListItem {
  return {
    id: overrides.id ?? "department-1",
    code: overrides.code ?? "HR-OPS",
    name: overrides.name ?? "العمليات والموارد البشرية",
    description: overrides.description ?? "قسم يتابع شؤون الموظفين.",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-04-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-01T00:00:00.000Z",
    _count: overrides._count ?? { employees: 3 },
    createdBy: overrides.createdBy ?? null,
    updatedBy: overrides.updatedBy ?? null,
  };
}

export function buildEmployeeDocumentListItem(
  employee: EmployeeFixture,
  overrides: Partial<Omit<EmployeeDocumentListItem, "employee">> = {},
): EmployeeDocumentListItem {
  return {
    id: overrides.id ?? "9001",
    employeeId: overrides.employeeId ?? employee.id,
    fileName: overrides.fileName ?? "National ID.pdf",
    filePath:
      overrides.filePath ??
      "https://cdn.school.local/hr/employees/emp-1/national-id.pdf",
    fileType: overrides.fileType ?? "application/pdf",
    fileSize: overrides.fileSize ?? 245000,
    fileCategory: overrides.fileCategory ?? "هوية",
    description: overrides.description ?? "نسخة واضحة من بطاقة الهوية",
    expiresAt: overrides.expiresAt ?? null,
    createdAt: overrides.createdAt ?? "2026-03-31T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-03-31T00:00:00.000Z",
    employee,
  };
}

export function buildEmployeeLeaveListItem(
  employee: EmployeeFixture,
  overrides: Partial<Omit<EmployeeLeaveListItem, "employee" | "approvedBy">> = {},
): EmployeeLeaveListItem {
  return {
    id: overrides.id ?? "leave-1",
    employeeId: overrides.employeeId ?? employee.id,
    leaveType: overrides.leaveType ?? "ANNUAL",
    startDate: overrides.startDate ?? "2026-04-10T00:00:00.000Z",
    endDate: overrides.endDate ?? "2026-04-12T00:00:00.000Z",
    totalDays: overrides.totalDays ?? 3,
    status: overrides.status ?? "PENDING",
    reason: overrides.reason ?? "Family commitment",
    notes: overrides.notes ?? "Awaiting approval",
    approvedAt: overrides.approvedAt ?? null,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-04-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-01T00:00:00.000Z",
    employee,
    approvedBy: null,
  };
}

export function buildEmployeeLeaveBalanceListItem(
  employee: EmployeeFixture,
  overrides: Partial<Omit<EmployeeLeaveBalanceListItem, "employee">> = {},
): EmployeeLeaveBalanceListItem {
  const allocatedDays = overrides.allocatedDays ?? 30;
  const carriedForwardDays = overrides.carriedForwardDays ?? 3;
  const manualAdjustmentDays = overrides.manualAdjustmentDays ?? 0;
  const usedDays = overrides.usedDays ?? 5;
  const totalEntitledDays =
    overrides.totalEntitledDays ??
    allocatedDays + carriedForwardDays + manualAdjustmentDays;

  return {
    id: overrides.id ?? "leave-balance-1",
    employeeId: overrides.employeeId ?? employee.id,
    leaveType: overrides.leaveType ?? "ANNUAL",
    balanceYear: overrides.balanceYear ?? 2026,
    allocatedDays,
    carriedForwardDays,
    manualAdjustmentDays,
    totalEntitledDays,
    usedDays,
    remainingDays: overrides.remainingDays ?? totalEntitledDays - usedDays,
    notes: overrides.notes ?? "رصيد سنوي أساسي",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-04-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-01T00:00:00.000Z",
    employee,
  };
}

export function buildEmployeeLifecycleChecklistListItem(
  employee: EmployeeFixture,
  assignedTo: EmployeeFixture | null = null,
  overrides: Partial<Omit<EmployeeLifecycleChecklistListItem, "employee" | "assignedTo">> = {},
): EmployeeLifecycleChecklistListItem {
  return {
    id: overrides.id ?? "lifecycle-1",
    employeeId: overrides.employeeId ?? employee.id,
    checklistType: overrides.checklistType ?? "ONBOARDING",
    title: overrides.title ?? "تسليم البريد المؤسسي",
    status: overrides.status ?? "PENDING",
    assignedToEmployeeId:
      overrides.assignedToEmployeeId === undefined
        ? assignedTo?.id ?? null
        : overrides.assignedToEmployeeId,
    dueDate: overrides.dueDate ?? "2026-04-05T00:00:00.000Z",
    completedAt: overrides.completedAt ?? null,
    notes: overrides.notes ?? "بالتنسيق مع تقنية المعلومات",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-04-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-01T00:00:00.000Z",
    employee,
    assignedTo,
  };
}

export function buildEmployeeTalentMappingListItem(
  employee: EmployeeFixture,
  talent: TalentFixture,
  overrides: Partial<Omit<EmployeeTalentMappingListItem, "employee" | "talent">> = {},
): EmployeeTalentMappingListItem {
  return {
    id: overrides.id ?? "map-1",
    employeeId: overrides.employeeId ?? employee.id,
    talentId: overrides.talentId ?? talent.id,
    notes: overrides.notes ?? "Runs handwriting club",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-01-15T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-15T00:00:00.000Z",
    employee,
    talent,
  };
}

export function buildEmployeePerformanceEvaluationListItem(
  employee: EmployeeFixture,
  evaluator: EmployeeFixture,
  year: AcademicYearFixture,
  overrides: Partial<
    Omit<
      EmployeePerformanceEvaluationListItem,
      "employee" | "evaluator" | "academicYear"
    >
  > = {},
): EmployeePerformanceEvaluationListItem {
  return {
    id: overrides.id ?? "eval-1",
    employeeId: overrides.employeeId ?? employee.id,
    academicYearId: overrides.academicYearId ?? year.id,
    evaluationDate: overrides.evaluationDate ?? "2026-01-15T00:00:00.000Z",
    score: overrides.score ?? 88,
    ratingLevel: overrides.ratingLevel ?? "VERY_GOOD",
    evaluatorEmployeeId: overrides.evaluatorEmployeeId ?? evaluator.id,
    strengths: overrides.strengths ?? "Good classroom management",
    weaknesses: overrides.weaknesses ?? null,
    recommendations: overrides.recommendations ?? null,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-01-15T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-15T00:00:00.000Z",
    employee,
    evaluator,
    academicYear: {
      id: year.id,
      code: year.code,
      name: year.name,
      status: year.status,
    },
  };
}

export function buildEmployeeViolationListItem(
  employee: EmployeeFixture,
  reportedBy: EmployeeFixture,
  overrides: Partial<Omit<EmployeeViolationListItem, "employee" | "reportedBy">> = {},
): EmployeeViolationListItem {
  return {
    id: overrides.id ?? "vio-1",
    employeeId: overrides.employeeId ?? employee.id,
    violationDate: overrides.violationDate ?? "2026-01-14T00:00:00.000Z",
    violationAspect: overrides.violationAspect ?? "Late arrival",
    violationText: overrides.violationText ?? "Arrived 20 minutes late",
    actionTaken: overrides.actionTaken ?? "Written warning",
    severity: overrides.severity ?? "MEDIUM",
    hasWarning: overrides.hasWarning ?? true,
    hasMinutes: overrides.hasMinutes ?? false,
    reportedByEmployeeId: overrides.reportedByEmployeeId ?? reportedBy.id,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-01-14T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-14T00:00:00.000Z",
    employee,
    reportedBy,
  };
}

export function buildTalentCatalogListItem(
  talent: TalentFixture,
  overrides: Partial<Omit<TalentCatalogListItem, "code" | "name" | "isActive">> = {},
): TalentCatalogListItem {
  return {
    id: overrides.id ?? talent.id,
    code: talent.code,
    name: talent.name,
    description: overrides.description ?? null,
    isActive: talent.isActive,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    createdBy: overrides.createdBy ?? null,
    updatedBy: overrides.updatedBy ?? null,
  };
}

export function buildAcademicMonthListItem(
  year: AcademicYearFixture,
  term: AcademicTermFixture,
  overrides: Partial<Omit<AcademicMonthListItem, "academicYear" | "academicTerm">> = {},
): AcademicMonthListItem {
  return {
    id: overrides.id ?? "month-1",
    academicYearId: overrides.academicYearId ?? year.id,
    academicTermId: overrides.academicTermId ?? term.id,
    code: overrides.code ?? "M1",
    name: overrides.name ?? "Month 1 - September",
    sequence: overrides.sequence ?? 1,
    startDate: overrides.startDate ?? "2025-09-01T00:00:00.000Z",
    endDate: overrides.endDate ?? "2025-09-30T23:59:59.000Z",
    status: overrides.status ?? "DRAFT",
    isCurrent: overrides.isCurrent ?? false,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    _count: overrides._count ?? { monthlyGrades: 0 },
    academicYear: year,
    academicTerm: {
      id: term.id,
      code: term.code,
      name: term.name,
      sequence: term.sequence,
      termType: term.termType,
      isActive: term.isActive,
      startDate: term.startDate,
      endDate: term.endDate,
    },
  };
}

export function buildGradingPolicyListItem(
  year: AcademicYearFixture,
  gradeLevel: GradeLevelFixture,
  subject: SubjectFixture,
  overrides: Partial<Omit<GradingPolicyListItem, "academicYear" | "gradeLevel" | "subject">> = {},
): GradingPolicyListItem {
  return {
      id: overrides.id ?? "policy-1",
      academicYearId: overrides.academicYearId ?? year.id,
      gradeLevelId: overrides.gradeLevelId ?? gradeLevel.id,
      subjectId: overrides.subjectId ?? subject.id,
      assessmentType: overrides.assessmentType ?? "MONTHLY",
      academicTermId: overrides.academicTermId ?? null,
      version: overrides.version ?? 1,
      totalMaxScore: overrides.totalMaxScore ?? 100,
      passingScore: overrides.passingScore ?? 50,
      isDefault: overrides.isDefault ?? true,
      status: overrides.status ?? "DRAFT",
    notes: overrides.notes ?? null,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    academicYear: year,
    gradeLevel,
    subject,
    components: overrides.components ?? [],
    createdBy: overrides.createdBy ?? null,
    updatedBy: overrides.updatedBy ?? null,
  };
}

function ensureNonEmpty<T>(items: T[], entityName: string): T {
  if (items.length === 0) {
    throw new Error(`${entityName} fixtures must not be empty`);
  }

  return items[0];
}

function findEmployee(
  employees: EmployeeFixture[],
  employeeId: unknown,
  fallbackIndex = 0,
): EmployeeFixture {
  const fallbackEmployee = employees[fallbackIndex] ?? ensureNonEmpty(employees, "Employee");
  if (typeof employeeId !== "string") {
    return fallbackEmployee;
  }

  return employees.find((employee) => employee.id === employeeId) ?? fallbackEmployee;
}

function findTalent(
  talents: TalentFixture[],
  talentId: unknown,
  fallbackIndex = 0,
): TalentFixture {
  const fallbackTalent = talents[fallbackIndex] ?? ensureNonEmpty(talents, "Talent");
  if (typeof talentId !== "string") {
    return fallbackTalent;
  }

  return talents.find((talent) => talent.id === talentId) ?? fallbackTalent;
}

function findAcademicYear(
  years: AcademicYearFixture[],
  yearId: unknown,
  fallbackIndex = 0,
): AcademicYearFixture {
  const fallbackYear = years[fallbackIndex] ?? ensureNonEmpty(years, "Academic year");
  if (typeof yearId !== "string") {
    return fallbackYear;
  }

  return years.find((year) => year.id === yearId) ?? fallbackYear;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

export function buildCreatedEmployeeCourseFromPayload(
  payload: JsonObject,
  employees: EmployeeFixture[],
  overrides: Partial<Omit<EmployeeCourseListItem, "employee">> = {},
): EmployeeCourseListItem {
  const employee = findEmployee(employees, payload.employeeId, 0);

  return buildEmployeeCourseListItem(employee, {
    id: "course-2",
    employeeId: asString(payload.employeeId, employee.id),
    courseName: asString(payload.courseName),
    courseProvider: asNullableString(payload.courseProvider),
    courseDate: asNullableString(payload.courseDate),
    durationDays: asNumberOrNull(payload.durationDays),
    certificateNumber: asNullableString(payload.certificateNumber),
    notes: asNullableString(payload.notes),
    isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
    createdAt: "2026-02-24T00:00:00.000Z",
    updatedAt: "2026-02-24T00:00:00.000Z",
    ...overrides,
  });
}

export function buildCreatedEmployeeTalentMappingFromPayload(
  payload: JsonObject,
  employees: EmployeeFixture[],
  talents: TalentFixture[],
  overrides: Partial<Omit<EmployeeTalentMappingListItem, "employee" | "talent">> = {},
): EmployeeTalentMappingListItem {
  const employee = findEmployee(employees, payload.employeeId, 0);
  const talent = findTalent(talents, payload.talentId, 0);

  return buildEmployeeTalentMappingListItem(employee, talent, {
    id: "map-2",
    employeeId: asString(payload.employeeId, employee.id),
    talentId: asString(payload.talentId, talent.id),
    notes: asNullableString(payload.notes),
    isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
    createdAt: "2026-02-24T00:00:00.000Z",
    updatedAt: "2026-02-24T00:00:00.000Z",
    ...overrides,
  });
}

export function buildCreatedEmployeePerformanceEvaluationFromPayload(
  payload: JsonObject,
  employees: EmployeeFixture[],
  years: AcademicYearFixture[],
  overrides: Partial<
    Omit<
      EmployeePerformanceEvaluationListItem,
      "employee" | "evaluator" | "academicYear"
    >
  > = {},
): EmployeePerformanceEvaluationListItem {
  const employee = findEmployee(employees, payload.employeeId, 0);
  const evaluator = findEmployee(employees, payload.evaluatorEmployeeId, 1);
  const academicYear = findAcademicYear(years, payload.academicYearId, 0);

  return buildEmployeePerformanceEvaluationListItem(employee, evaluator, academicYear, {
    id: "eval-2",
    employeeId: asString(payload.employeeId, employee.id),
    academicYearId: asString(payload.academicYearId, academicYear.id),
    evaluationDate: asString(payload.evaluationDate, "2026-02-24T00:00:00.000Z"),
    score: typeof payload.score === "number" ? payload.score : 0,
    ratingLevel: asString(payload.ratingLevel, "EXCELLENT"),
    evaluatorEmployeeId: asNullableString(payload.evaluatorEmployeeId),
    strengths: asNullableString(payload.strengths),
    weaknesses: asNullableString(payload.weaknesses),
    recommendations: asNullableString(payload.recommendations),
    isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
    createdAt: "2026-02-24T00:00:00.000Z",
    updatedAt: "2026-02-24T00:00:00.000Z",
    ...overrides,
  });
}

export function buildCreatedEmployeeViolationFromPayload(
  payload: JsonObject,
  employees: EmployeeFixture[],
  overrides: Partial<Omit<EmployeeViolationListItem, "employee" | "reportedBy">> = {},
): EmployeeViolationListItem {
  const employee = findEmployee(employees, payload.employeeId, 0);
  const reportedBy = findEmployee(employees, payload.reportedByEmployeeId, 1);

  return buildEmployeeViolationListItem(employee, reportedBy, {
    id: "vio-2",
    employeeId: asString(payload.employeeId, employee.id),
    violationDate: asString(payload.violationDate, "2026-02-24T00:00:00.000Z"),
    violationAspect: asString(payload.violationAspect),
    violationText: asString(payload.violationText),
    actionTaken: asString(payload.actionTaken),
    severity: asString(payload.severity, "LOW"),
    hasWarning: payload.hasWarning === undefined ? false : Boolean(payload.hasWarning),
    hasMinutes: payload.hasMinutes === undefined ? false : Boolean(payload.hasMinutes),
    reportedByEmployeeId: asString(payload.reportedByEmployeeId, reportedBy.id),
    isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
    createdAt: "2026-02-24T00:00:00.000Z",
    updatedAt: "2026-02-24T00:00:00.000Z",
    ...overrides,
  });
}

export function buildCreatedTalentCatalogFromPayload(
  payload: JsonObject,
  overrides: Partial<Omit<TalentCatalogListItem, "code" | "name">> = {},
): TalentCatalogListItem {
  return {
    id: "tal-created",
    code: asString(payload.code, "TAL-NEW"),
    name: asString(payload.name, "New Talent"),
    description: asNullableString(payload.description),
    isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
    createdAt: "2026-02-24T00:00:00.000Z",
    updatedAt: "2026-02-24T00:00:00.000Z",
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

export function buildCreatedAcademicMonthFromPayload(
  payload: JsonObject,
  years: AcademicYearFixture[],
  terms: AcademicTermFixture[],
  overrides: Partial<Omit<AcademicMonthListItem, "academicYear" | "academicTerm">> = {},
): AcademicMonthListItem {
  const year = findAcademicYear(years, payload.academicYearId, 0);
  const fallbackTerm = terms[0];
  if (!fallbackTerm) {
    throw new Error("Academic term fixtures must not be empty");
  }
  const termId = asString(payload.academicTermId, fallbackTerm.id);
  const term = terms.find((item) => item.id === termId) ?? fallbackTerm;

  return buildAcademicMonthListItem(year, term, {
    id: "month-created",
    academicYearId: asString(payload.academicYearId, year.id),
    academicTermId: asString(payload.academicTermId, term.id),
    code: asString(payload.code, "M-NEW"),
    name: asString(payload.name, "Month New"),
    sequence: typeof payload.sequence === "number" ? payload.sequence : 1,
    startDate: asString(payload.startDate, term.startDate),
    endDate: asString(payload.endDate, term.endDate),
    status: asString(payload.status, "DRAFT"),
    isCurrent: payload.isCurrent === undefined ? false : Boolean(payload.isCurrent),
    isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
    createdAt: "2026-02-24T00:00:00.000Z",
    updatedAt: "2026-02-24T00:00:00.000Z",
    ...overrides,
  });
}

export function buildCreatedGradingPolicyFromPayload(
  payload: JsonObject,
  years: AcademicYearFixture[],
  gradeLevels: GradeLevelFixture[],
  subjects: SubjectFixture[],
  overrides: Partial<Omit<GradingPolicyListItem, "academicYear" | "gradeLevel" | "subject">> = {},
): GradingPolicyListItem {
  const year = findAcademicYear(years, payload.academicYearId, 0);
  const fallbackGradeLevel = gradeLevels[0];
  const fallbackSubject = subjects[0];
  if (!fallbackGradeLevel || !fallbackSubject) {
    throw new Error("Grade level and subject fixtures must not be empty");
  }

  const gradeLevelId = asString(payload.gradeLevelId, fallbackGradeLevel.id);
  const subjectId = asString(payload.subjectId, fallbackSubject.id);
  const gradeLevel =
    gradeLevels.find((item) => item.id === gradeLevelId) ?? fallbackGradeLevel;
  const subject = subjects.find((item) => item.id === subjectId) ?? fallbackSubject;

    return buildGradingPolicyListItem(year, gradeLevel, subject, {
      id: "policy-created",
      academicYearId: asString(payload.academicYearId, year.id),
      gradeLevelId: asString(payload.gradeLevelId, gradeLevel.id),
      subjectId: asString(payload.subjectId, subject.id),
      assessmentType: asString(payload.assessmentType, "MONTHLY"),
      totalMaxScore:
        typeof payload.totalMaxScore === "number" ? payload.totalMaxScore : 100,
      academicTermId: asNullableString(payload.academicTermId),
      version: typeof payload.version === "number" ? payload.version : 1,
      passingScore: typeof payload.passingScore === "number" ? payload.passingScore : 0,
      isDefault: payload.isDefault === undefined ? false : Boolean(payload.isDefault),
    status: asString(payload.status, "DRAFT"),
    notes: asNullableString(payload.notes),
    isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
    createdAt: "2026-02-24T00:00:00.000Z",
    updatedAt: "2026-02-24T00:00:00.000Z",
    ...overrides,
  });
}

export function buildGradingSummaryReportResponse(
  overrides: Partial<GradingSummaryReportResponse> = {},
): GradingSummaryReportResponse {
  return {
    generatedAt: "2026-02-24T00:00:00.000Z",
    scope: {
      academicYearId: null,
      gradeLevelId: null,
      sectionId: null,
      academicTermId: null,
      fromDate: null,
      toDate: null,
    },
    semesterGrades: {
      total: 20,
      active: 18,
      inactive: 2,
      locked: 15,
      unlocked: 5,
      lockRate: 75,
      byStatus: [
        { status: "DRAFT", count: 2 },
        { status: "IN_REVIEW", count: 3 },
        { status: "APPROVED", count: 15 },
      ],
    },
    annualGrades: {
      total: 20,
      active: 20,
      inactive: 0,
      locked: 10,
      unlocked: 10,
      lockRate: 50,
      byStatus: [
        { status: "DRAFT", count: 4 },
        { status: "APPROVED", count: 16 },
      ],
      byFinalStatus: [
        { finalStatusId: "st-pass", code: "PASS", name: "Passed", count: 16 },
        { finalStatusId: "st-fail", code: "FAIL", name: "Failed", count: 4 },
      ],
    },
    annualResults: {
      total: 20,
      active: 20,
      inactive: 0,
      locked: 8,
      unlocked: 12,
      lockRate: 40,
      byStatus: [
        { status: "DRAFT", count: 5 },
        { status: "APPROVED", count: 15 },
      ],
      byPromotionDecision: [
        {
          promotionDecisionId: "pd-promoted",
          code: "PROMOTED",
          name: "Promoted to next grade",
          count: 15,
        },
        {
          promotionDecisionId: "pd-retained",
          code: "RETAINED",
          name: "Retained in same grade",
          count: 5,
        },
      ],
    },
    rankingReadiness: {
      withClassRank: 18,
      withGradeRank: 17,
      fullyRanked: 16,
      missingClassRank: 2,
      missingGradeRank: 3,
      notFullyRanked: 4,
    },
    ...overrides,
  };
}

export function buildGradingDetailedReportList(
  overrides: Partial<GradingDetailedReportItem>[] = [],
): GradingDetailedReportItem[] {
  const base: GradingDetailedReportItem[] = [
    {
      id: "annual-result-1",
      studentEnrollmentId: "enroll-1",
      academicYearId: "year-1",
      totalAllSubjects: 540,
      maxPossibleTotal: 600,
      percentage: 90,
      rankInClass: 1,
      rankInGrade: 2,
      passedSubjectsCount: 10,
      failedSubjectsCount: 0,
      status: "APPROVED",
      isLocked: true,
      isActive: true,
      calculatedAt: "2026-02-24T00:00:00.000Z",
      notes: null,
      createdAt: "2026-02-24T00:00:00.000Z",
      updatedAt: "2026-02-24T00:00:00.000Z",
      student: {
        id: "student-1",
        admissionNo: "2026-0001",
        fullName: "طالب تجريبي 1",
      },
      section: {
        id: "sec-1",
        code: "SEC-1",
        name: "الشعبة أ",
        gradeLevel: {
          id: "grade-1",
          code: "GRADE-1",
          name: "الصف الأول",
        },
      },
      gradeLevel: {
        id: "grade-1",
        code: "GRADE-1",
        name: "الصف الأول",
      },
      academicYear: {
        id: "year-1",
        code: "2026-2027",
        name: "السنة الدراسية 2026-2027",
      },
      promotionDecision: {
        id: "pd-promoted",
        code: "PROMOTED",
        name: "ترفيع",
      },
      gradeDescription: {
        id: 1,
        minPercentage: 85,
        maxPercentage: 100,
        nameAr: "ممتاز",
        nameEn: "Excellent",
        colorCode: "#22C55E",
        sortOrder: 1,
      },
    },
  ];

  if (overrides.length === 0) {
    return base;
  }

  return overrides.map((override, index) => ({
    ...(base[index] ?? base[0]),
    ...override,
  }));
}

export function buildHrSummaryReportResponse(
  overrides: Partial<HrSummaryReportResponse> = {},
): HrSummaryReportResponse {
  return {
    generatedAt: "2026-02-24T00:00:00.000Z",
    scope: {
      fromDate: null,
      toDate: null,
      employeeId: null,
    },
    employees: {
      total: 10,
      active: 9,
      inactive: 1,
      withUserAccount: 8,
      withoutUserAccount: 2,
    },
    attendance: {
      total: 120,
      byStatus: [
        { status: "PRESENT", count: 100 },
        { status: "ABSENT", count: 10 },
        { status: "LATE", count: 10 },
      ],
      indicators: {
        presentRate: 83.33,
        absentRate: 8.33,
        lateRate: 8.33,
        excusedAbsenceRate: 0,
        earlyLeaveRate: 0,
      },
    },
    violations: {
      total: 8,
      withWarning: 3,
      bySeverity: [
        { severity: "LOW", count: 4 },
        { severity: "MEDIUM", count: 3 },
        { severity: "HIGH", count: 1 },
      ],
    },
    courses: {
      total: 14,
    },
    workload: {
      activeTeachingAssignments: 22,
      activeTasks: 19,
    },
    performance: {
      totalEvaluations: 10,
      byRating: [
        { ratingLevel: "EXCELLENT", count: 4 },
        { ratingLevel: "VERY_GOOD", count: 3 },
        { ratingLevel: "GOOD", count: 3 },
      ],
    },
    organization: {
      departmentDistribution: [
        {
          departmentId: "dept-1",
          departmentCode: "HR",
          departmentName: "الموارد البشرية",
          employeeCount: 4,
        },
        {
          departmentId: "dept-2",
          departmentCode: "ACA",
          departmentName: "الشؤون الأكاديمية",
          employeeCount: 3,
        },
      ],
      unassignedEmployees: 2,
    },
    compliance: {
      thresholdDays: 30,
      incompleteProfiles: 2,
      employeesWithoutDocuments: 3,
      contractsExpiringSoon: 1,
      contractsExpired: 1,
      documentsExpiringSoon: 2,
      documentsExpired: 1,
      identitiesExpiringSoon: 1,
      identitiesExpired: 1,
    },
    ...overrides,
  };
}
