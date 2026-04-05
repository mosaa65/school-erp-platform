import type { Page } from "@playwright/test";

type EmployeeCourseFormValues = {
  employeeId?: string;
  courseName?: string;
  courseProvider?: string;
  courseDate?: string;
  durationDays?: string;
  certificateNumber?: string;
  notes?: string;
  submit?: boolean;
};

type EmployeeContractFormValues = {
  employeeId?: string;
  contractTitle?: string;
  contractNumber?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  salaryAmount?: string;
  notes?: string;
  isCurrent?: boolean;
  isActive?: boolean;
  submit?: boolean;
};

type EmployeeDocumentFormValues = {
  employeeId?: string;
  fileName?: string;
  filePath?: string;
  fileType?: string;
  fileSize?: string;
  fileCategory?: string;
  description?: string;
  expiresAt?: string;
  submit?: boolean;
};

type EmployeeDepartmentFormValues = {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  submit?: boolean;
};

type EmployeeLeaveFormValues = {
  employeeId?: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  reason?: string;
  notes?: string;
  isActive?: boolean;
  submit?: boolean;
};

type EmployeeLeaveBalanceFormValues = {
  employeeId?: string;
  leaveType?: string;
  balanceYear?: string;
  allocatedDays?: string;
  carriedForwardDays?: string;
  manualAdjustmentDays?: string;
  notes?: string;
  isActive?: boolean;
  submit?: boolean;
};

type EmployeeLifecycleChecklistFormValues = {
  employeeId?: string;
  checklistType?: string;
  title?: string;
  status?: string;
  assignedToEmployeeId?: string;
  dueDate?: string;
  notes?: string;
  isActive?: boolean;
  submit?: boolean;
};

type EmployeeTalentFormValues = {
  employeeId?: string;
  talentId?: string;
  notes?: string;
  submit?: boolean;
};

type EmployeePerformanceEvaluationFormValues = {
  employeeId?: string;
  academicYearId?: string;
  evaluationDate?: string;
  score?: string;
  ratingLevel?: string;
  evaluatorEmployeeId?: string;
  strengths?: string;
  weaknesses?: string;
  recommendations?: string;
  submit?: boolean;
};

type EmployeeViolationFormValues = {
  employeeId?: string;
  violationDate?: string;
  violationAspect?: string;
  violationText?: string;
  actionTaken?: string;
  severity?: string;
  reportedByEmployeeId?: string;
  submit?: boolean;
};

type TalentCatalogFormValues = {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  submit?: boolean;
};

type AcademicMonthFormValues = {
  academicYearId?: string;
  academicTermId?: string;
  code?: string;
  name?: string;
  sequence?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  isCurrent?: boolean;
  isActive?: boolean;
  submit?: boolean;
};

type GradingPolicyFormValues = {
  academicYearId?: string;
  gradeLevelId?: string;
  subjectId?: string;
  assessmentType?: string;
  totalMaxScore?: string;
  academicTermId?: string;
  passingScore?: string;
  status?: string;
  notes?: string;
  isDefault?: boolean;
  isActive?: boolean;
  submit?: boolean;
};

export async function fillEmployeeCourseForm(
  page: Page,
  values: EmployeeCourseFormValues,
) {
  if (values.employeeId !== undefined) {
    await page.getByTestId("course-form-employee").selectOption(values.employeeId);
  }
  if (values.courseName !== undefined) {
    await page.getByTestId("course-form-name").fill(values.courseName);
  }
  if (values.courseProvider !== undefined) {
    await page.getByTestId("course-form-provider").fill(values.courseProvider);
  }
  if (values.courseDate !== undefined) {
    await page.getByTestId("course-form-date").fill(values.courseDate);
  }
  if (values.durationDays !== undefined) {
    await page.getByTestId("course-form-duration").fill(values.durationDays);
  }
  if (values.certificateNumber !== undefined) {
    await page
      .getByTestId("course-form-certificate")
      .fill(values.certificateNumber);
  }
  if (values.notes !== undefined) {
    await page.getByTestId("course-form-notes").fill(values.notes);
  }
  if (values.submit) {
    await page.getByTestId("course-form-submit").click();
  }
}

export async function fillEmployeeContractForm(
  page: Page,
  values: EmployeeContractFormValues,
) {
  if (values.employeeId !== undefined) {
    await page.getByTestId("contract-form-employee").selectOption(values.employeeId);
  }
  if (values.contractTitle !== undefined) {
    await page.getByTestId("contract-form-title").fill(values.contractTitle);
  }
  if (values.contractNumber !== undefined) {
    await page.getByTestId("contract-form-number").fill(values.contractNumber);
  }
  if (values.contractStartDate !== undefined) {
    await page.getByTestId("contract-form-start-date").fill(values.contractStartDate);
  }
  if (values.contractEndDate !== undefined) {
    await page.getByTestId("contract-form-end-date").fill(values.contractEndDate);
  }
  if (values.salaryAmount !== undefined) {
    await page.getByTestId("contract-form-salary").fill(values.salaryAmount);
  }
  if (values.notes !== undefined) {
    await page.getByTestId("contract-form-notes").fill(values.notes);
  }
  if (values.isCurrent !== undefined) {
    const checkbox = page.getByTestId("contract-form-current");
    if ((await checkbox.isChecked()) !== values.isCurrent) {
      await checkbox.click();
    }
  }
  if (values.isActive !== undefined) {
    const checkbox = page.getByTestId("contract-form-active");
    if ((await checkbox.isChecked()) !== values.isActive) {
      await checkbox.click();
    }
  }
  if (values.submit) {
    await page.getByTestId("contract-form-submit").click();
  }
}

export async function fillEmployeeDocumentForm(
  page: Page,
  values: EmployeeDocumentFormValues,
) {
  if (values.employeeId !== undefined) {
    await page.getByTestId("document-form-employee").selectOption(values.employeeId);
  }
  if (values.fileName !== undefined) {
    await page.getByTestId("document-form-file-name").fill(values.fileName);
  }
  if (values.filePath !== undefined) {
    await page.getByTestId("document-form-file-path").fill(values.filePath);
  }
  if (values.fileType !== undefined) {
    await page.getByTestId("document-form-type").fill(values.fileType);
  }
  if (values.fileSize !== undefined) {
    await page.getByTestId("document-form-size").fill(values.fileSize);
  }
  if (values.fileCategory !== undefined) {
    await page.getByTestId("document-form-category").fill(values.fileCategory);
  }
  if (values.description !== undefined) {
    await page.getByTestId("document-form-description").fill(values.description);
  }
  if (values.expiresAt !== undefined) {
    await page.getByTestId("document-form-expiry-date").fill(values.expiresAt);
  }
  if (values.submit) {
    await page.getByTestId("document-form-submit").click();
  }
}

export async function fillEmployeeDepartmentForm(
  page: Page,
  values: EmployeeDepartmentFormValues,
) {
  if (values.code !== undefined) {
    await page.getByTestId("department-form-code").fill(values.code);
  }
  if (values.name !== undefined) {
    await page.getByTestId("department-form-name").fill(values.name);
  }
  if (values.description !== undefined) {
    await page.getByTestId("department-form-description").fill(values.description);
  }
  if (values.isActive !== undefined) {
    const checkbox = page.getByTestId("department-form-active");
    if ((await checkbox.isChecked()) !== values.isActive) {
      await checkbox.click();
    }
  }
  if (values.submit) {
    await page.getByTestId("department-form-submit").click();
  }
}

export async function fillEmployeeLeaveForm(
  page: Page,
  values: EmployeeLeaveFormValues,
) {
  if (values.employeeId !== undefined) {
    await page.getByTestId("leave-form-employee").selectOption(values.employeeId);
  }
  if (values.leaveType !== undefined) {
    await page.getByTestId("leave-form-type").selectOption(values.leaveType);
  }
  if (values.startDate !== undefined) {
    await page.getByTestId("leave-form-start-date").fill(values.startDate);
  }
  if (values.endDate !== undefined) {
    await page.getByTestId("leave-form-end-date").fill(values.endDate);
  }
  if (values.status !== undefined) {
    const statusField = page.getByTestId("leave-form-status");
    if ((await statusField.count()) > 0) {
      await statusField.selectOption(values.status);
    }
  }
  if (values.reason !== undefined) {
    await page.getByTestId("leave-form-reason").fill(values.reason);
  }
  if (values.notes !== undefined) {
    await page.getByTestId("leave-form-notes").fill(values.notes);
  }
  if (values.isActive !== undefined) {
    const checkbox = page.getByTestId("leave-form-active");
    if ((await checkbox.isChecked()) !== values.isActive) {
      await checkbox.click();
    }
  }
  if (values.submit) {
    await page.getByTestId("leave-form-submit").click();
  }
}

export async function fillEmployeeLeaveBalanceForm(
  page: Page,
  values: EmployeeLeaveBalanceFormValues,
) {
  if (values.employeeId !== undefined) {
    await page
      .getByTestId("leave-balance-form-employee")
      .selectOption(values.employeeId);
  }
  if (values.leaveType !== undefined) {
    await page
      .getByTestId("leave-balance-form-type")
      .selectOption(values.leaveType);
  }
  if (values.balanceYear !== undefined) {
    await page
      .getByTestId("leave-balance-form-year")
      .fill(values.balanceYear);
  }
  if (values.allocatedDays !== undefined) {
    await page
      .getByTestId("leave-balance-form-allocated")
      .fill(values.allocatedDays);
  }
  if (values.carriedForwardDays !== undefined) {
    await page
      .getByTestId("leave-balance-form-carried")
      .fill(values.carriedForwardDays);
  }
  if (values.manualAdjustmentDays !== undefined) {
    await page
      .getByTestId("leave-balance-form-adjustment")
      .fill(values.manualAdjustmentDays);
  }
  if (values.notes !== undefined) {
    await page.getByTestId("leave-balance-form-notes").fill(values.notes);
  }
  if (values.isActive !== undefined) {
    const checkbox = page.getByTestId("leave-balance-form-active");
    if ((await checkbox.isChecked()) !== values.isActive) {
      await checkbox.click();
    }
  }
  if (values.submit) {
    await page.getByTestId("leave-balance-form-submit").click();
  }
}

export async function fillEmployeeLifecycleChecklistForm(
  page: Page,
  values: EmployeeLifecycleChecklistFormValues,
) {
  if (values.employeeId !== undefined) {
    await page.getByTestId("lifecycle-form-employee").selectOption(values.employeeId);
  }
  if (values.checklistType !== undefined) {
    await page.getByTestId("lifecycle-form-type").selectOption(values.checklistType);
  }
  if (values.title !== undefined) {
    await page.getByTestId("lifecycle-form-title").fill(values.title);
  }
  if (values.status !== undefined) {
    const statusField = page.getByTestId("lifecycle-form-status");
    if ((await statusField.count()) > 0) {
      await statusField.selectOption(values.status);
    }
  }
  if (values.assignedToEmployeeId !== undefined) {
    await page
      .getByTestId("lifecycle-form-assignee")
      .selectOption(values.assignedToEmployeeId);
  }
  if (values.dueDate !== undefined) {
    await page.getByTestId("lifecycle-form-due-date").fill(values.dueDate);
  }
  if (values.notes !== undefined) {
    await page.getByTestId("lifecycle-form-notes").fill(values.notes);
  }
  if (values.isActive !== undefined) {
    const checkbox = page.getByTestId("lifecycle-form-active");
    if ((await checkbox.isChecked()) !== values.isActive) {
      await checkbox.click();
    }
  }
  if (values.submit) {
    await page.getByTestId("lifecycle-form-submit").click();
  }
}

export async function fillEmployeeTalentForm(
  page: Page,
  values: EmployeeTalentFormValues,
) {
  if (values.employeeId !== undefined) {
    await page.getByTestId("talent-form-employee").selectOption(values.employeeId);
  }
  if (values.talentId !== undefined) {
    await page.getByTestId("talent-form-talent").selectOption(values.talentId);
  }
  if (values.notes !== undefined) {
    await page.getByTestId("talent-form-notes").fill(values.notes);
  }
  if (values.submit) {
    await page.getByTestId("talent-form-submit").click();
  }
}

export async function fillEmployeePerformanceEvaluationForm(
  page: Page,
  values: EmployeePerformanceEvaluationFormValues,
) {
  if (values.employeeId !== undefined) {
    await page
      .getByTestId("evaluation-form-employee")
      .selectOption(values.employeeId);
  }
  if (values.academicYearId !== undefined) {
    await page
      .getByTestId("evaluation-form-academic-year")
      .selectOption(values.academicYearId);
  }
  if (values.evaluationDate !== undefined) {
    await page
      .getByTestId("evaluation-form-date")
      .fill(values.evaluationDate);
  }
  if (values.score !== undefined) {
    await page.getByTestId("evaluation-form-score").fill(values.score);
  }
  if (values.ratingLevel !== undefined) {
    await page
      .getByTestId("evaluation-form-rating-level")
      .selectOption(values.ratingLevel);
  }
  if (values.evaluatorEmployeeId !== undefined) {
    await page
      .getByTestId("evaluation-form-evaluator")
      .selectOption(values.evaluatorEmployeeId);
  }
  if (values.strengths !== undefined) {
    await page.getByTestId("evaluation-form-strengths").fill(values.strengths);
  }
  if (values.weaknesses !== undefined) {
    await page
      .getByTestId("evaluation-form-weaknesses")
      .fill(values.weaknesses);
  }
  if (values.recommendations !== undefined) {
    await page
      .getByTestId("evaluation-form-recommendations")
      .fill(values.recommendations);
  }
  if (values.submit) {
    await page.getByTestId("evaluation-form-submit").click();
  }
}

export async function fillEmployeeViolationForm(
  page: Page,
  values: EmployeeViolationFormValues,
) {
  if (values.employeeId !== undefined) {
    await page.getByTestId("violation-form-employee").selectOption(values.employeeId);
  }
  if (values.violationDate !== undefined) {
    await page.getByTestId("violation-form-date").fill(values.violationDate);
  }
  if (values.violationAspect !== undefined) {
    await page.getByTestId("violation-form-aspect").fill(values.violationAspect);
  }
  if (values.violationText !== undefined) {
    await page.getByTestId("violation-form-text").fill(values.violationText);
  }
  if (values.actionTaken !== undefined) {
    await page.getByTestId("violation-form-action-taken").fill(values.actionTaken);
  }
  if (values.severity !== undefined) {
    await page.getByTestId("violation-form-severity").selectOption(values.severity);
  }
  if (values.reportedByEmployeeId !== undefined) {
    await page
      .getByTestId("violation-form-reporter")
      .selectOption(values.reportedByEmployeeId);
  }
  if (values.submit) {
    await page.getByTestId("violation-form-submit").click();
  }
}

export async function fillTalentCatalogForm(
  page: Page,
  values: TalentCatalogFormValues,
) {
  if (values.code !== undefined) {
    await page.getByTestId("talent-catalog-form-code").fill(values.code);
  }
  if (values.name !== undefined) {
    await page.getByTestId("talent-catalog-form-name").fill(values.name);
  }
  if (values.description !== undefined) {
    await page
      .getByTestId("talent-catalog-form-description")
      .fill(values.description);
  }
  if (values.isActive !== undefined) {
    const checkbox = page.getByTestId("talent-catalog-form-active");
    if ((await checkbox.isChecked()) !== values.isActive) {
      await checkbox.click();
    }
  }
  if (values.submit) {
    await page.getByTestId("talent-catalog-form-submit").click();
  }
}

export async function fillAcademicMonthForm(
  page: Page,
  values: AcademicMonthFormValues,
) {
  if (values.academicYearId !== undefined) {
    await page
      .getByTestId("academic-month-form-year")
      .selectOption(values.academicYearId);
  }
  if (values.academicTermId !== undefined) {
    await page
      .getByTestId("academic-month-form-term")
      .selectOption(values.academicTermId);
  }
  if (values.code !== undefined) {
    await page.getByTestId("academic-month-form-code").fill(values.code);
  }
  if (values.name !== undefined) {
    await page.getByTestId("academic-month-form-name").fill(values.name);
  }
  if (values.sequence !== undefined) {
    await page.getByTestId("academic-month-form-sequence").fill(values.sequence);
  }
  if (values.startDate !== undefined) {
    await page
      .getByTestId("academic-month-form-start-date")
      .fill(values.startDate);
  }
  if (values.endDate !== undefined) {
    await page.getByTestId("academic-month-form-end-date").fill(values.endDate);
  }
  if (values.status !== undefined) {
    await page.getByTestId("academic-month-form-status").selectOption(values.status);
  }
  if (values.isCurrent !== undefined) {
    const checkbox = page.getByTestId("academic-month-form-current");
    if ((await checkbox.isChecked()) !== values.isCurrent) {
      await checkbox.click();
    }
  }
  if (values.isActive !== undefined) {
    const checkbox = page.getByTestId("academic-month-form-active");
    if ((await checkbox.isChecked()) !== values.isActive) {
      await checkbox.click();
    }
  }
  if (values.submit) {
    await page.getByTestId("academic-month-form-submit").click();
  }
}

export async function fillGradingPolicyForm(
  page: Page,
  values: GradingPolicyFormValues,
) {
  if (values.academicYearId !== undefined) {
    await page
      .getByTestId("grading-policy-form-year")
      .selectOption(values.academicYearId);
  }
  if (values.gradeLevelId !== undefined) {
    await page
      .getByTestId("grading-policy-form-grade")
      .selectOption(values.gradeLevelId);
  }
  if (values.subjectId !== undefined) {
    await page.getByTestId("grading-policy-form-subject").selectOption(values.subjectId);
  }
  if (values.assessmentType !== undefined) {
    await page
      .getByTestId("grading-policy-form-assessment")
      .selectOption(values.assessmentType);
  }
  if (values.totalMaxScore !== undefined) {
    await page
      .getByTestId("grading-policy-form-total-max")
      .fill(values.totalMaxScore);
  }
  if (values.passingScore !== undefined) {
    await page.getByTestId("grading-policy-form-passing").fill(values.passingScore);
  }
  if (values.academicTermId !== undefined) {
    await page.getByTestId("grading-policy-form-term").selectOption(values.academicTermId);
  }
  if (values.status !== undefined) {
    await page.getByTestId("grading-policy-form-status").selectOption(values.status);
  }
  if (values.notes !== undefined) {
    await page.getByTestId("grading-policy-form-notes").fill(values.notes);
  }
  if (values.isDefault !== undefined) {
    const checkbox = page.getByTestId("grading-policy-form-default");
    if ((await checkbox.isChecked()) !== values.isDefault) {
      await checkbox.click();
    }
  }
  if (values.isActive !== undefined) {
    const checkbox = page.getByTestId("grading-policy-form-active");
    if ((await checkbox.isChecked()) !== values.isActive) {
      await checkbox.click();
    }
  }
  if (values.submit) {
    await page.getByTestId("grading-policy-form-submit").click();
  }
}
