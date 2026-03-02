function uniquePermissionCodes(codes: string[]): string[] {
  return Array.from(new Set(codes));
}

export const e2ePermissionSets = {
  employeeCoursesCrud: uniquePermissionCodes([
    "employee-courses.read",
    "employee-courses.create",
    "employee-courses.update",
    "employee-courses.delete",
    "employees.read",
  ]),
  employeeTalentsCrud: uniquePermissionCodes([
    "employee-talents.read",
    "employee-talents.create",
    "employee-talents.update",
    "employee-talents.delete",
    "employees.read",
    "talents.read",
  ]),
  employeePerformanceEvaluationsCrud: uniquePermissionCodes([
    "employee-performance-evaluations.read",
    "employee-performance-evaluations.create",
    "employee-performance-evaluations.update",
    "employee-performance-evaluations.delete",
    "employees.read",
    "academic-years.read",
  ]),
  employeeViolationsCrud: uniquePermissionCodes([
    "employee-violations.read",
    "employee-violations.create",
    "employee-violations.update",
    "employee-violations.delete",
    "employees.read",
  ]),
  talentsCrud: uniquePermissionCodes([
    "talents.read",
    "talents.create",
    "talents.update",
    "talents.delete",
  ]),
  academicMonthsCrud: uniquePermissionCodes([
    "academic-months.read",
    "academic-months.create",
    "academic-months.update",
    "academic-months.delete",
    "academic-years.read",
    "academic-terms.read",
  ]),
  gradingPoliciesCrud: uniquePermissionCodes([
    "grading-policies.read",
    "grading-policies.create",
    "grading-policies.update",
    "grading-policies.delete",
    "academic-years.read",
    "grade-levels.read",
    "subjects.read",
  ]),
  gradingReportsRead: uniquePermissionCodes([
    "grading-reports.read",
    "academic-years.read",
    "grade-levels.read",
    "sections.read",
    "academic-terms.read",
  ]),
  hrReportsRead: uniquePermissionCodes([
    "hr-reports.read",
    "employees.read",
  ]),
} as const;

export const defaultE2ePermissionCodes = uniquePermissionCodes([
  ...e2ePermissionSets.employeePerformanceEvaluationsCrud,
  ...e2ePermissionSets.employeeViolationsCrud,
  ...e2ePermissionSets.talentsCrud,
  ...e2ePermissionSets.academicMonthsCrud,
  ...e2ePermissionSets.gradingPoliciesCrud,
  ...e2ePermissionSets.gradingReportsRead,
  ...e2ePermissionSets.hrReportsRead,
]);
