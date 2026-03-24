import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AcademicMonthsModule } from './modules/academic-months/academic-months.module';
import { AnnualGradesModule } from './modules/grade-aggregation/annual-grades/annual-grades.module';
import { AnnualResultsModule } from './modules/results-decisions/annual-results/annual-results.module';
import { AnnualStatusesModule } from './modules/results-decisions/annual-statuses/annual-statuses.module';
import { AcademicTermsModule } from './modules/academic-terms/academic-terms.module';
import { AcademicYearsModule } from './modules/academic-years/academic-years.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { EmployeeAttendanceModule } from './modules/employee-attendance/employee-attendance.module';
import { EmployeeCoursesModule } from './modules/employee-courses/employee-courses.module';
import { EmployeePerformanceEvaluationsModule } from './modules/employee-performance-evaluations/employee-performance-evaluations.module';
import { EmployeeSectionSupervisionsModule } from './modules/teaching-assignments/employee-section-supervisions/employee-section-supervisions.module';
import { EmployeeTasksModule } from './modules/employee-tasks/employee-tasks.module';
import { EmployeeTalentsModule } from './modules/employee-talents/employee-talents.module';
import { EmployeeTeachingAssignmentsModule } from './modules/teaching-assignments/employee-teaching-assignments/employee-teaching-assignments.module';
import { EmployeeViolationsModule } from './modules/employee-violations/employee-violations.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DataScopeModule } from './modules/teaching-assignments/data-scope/data-scope.module';
import { GradeLevelSubjectsModule } from './modules/grade-level-subjects/grade-level-subjects.module';
import { GradeLevelsModule } from './modules/grade-levels/grade-levels.module';
import { GlobalSettingsModule } from './modules/global-settings/global-settings.module';
import { GradingOutcomeRulesModule } from './modules/evaluation-policies/grading-outcome-rules/grading-outcome-rules.module';
import { HomeworkTypesModule } from './modules/assignments/homework-types/homework-types.module';
import { HomeworksModule } from './modules/assignments/homeworks/homeworks.module';
import { HrReportsModule } from './modules/hr-reports/hr-reports.module';
import { LookupBloodTypesModule } from './modules/lookup-blood-types/lookup-blood-types.module';
import { LookupEnrollmentStatusesModule } from './modules/lookup-enrollment-statuses/lookup-enrollment-statuses.module';
import { LookupCatalogModule } from './modules/lookup-catalog/lookup-catalog.module';
import { LookupIdTypesModule } from './modules/lookup-id-types/lookup-id-types.module';
import { LookupOrphanStatusesModule } from './modules/lookup-orphan-statuses/lookup-orphan-statuses.module';
import { LookupAbilityLevelsModule } from './modules/lookup-ability-levels/lookup-ability-levels.module';
import { LookupActivityTypesModule } from './modules/lookup-activity-types/lookup-activity-types.module';
import { LookupGradeDescriptionsModule } from './modules/lookup-grade-descriptions/lookup-grade-descriptions.module';
import { LookupOwnershipTypesModule } from './modules/lookup-ownership-types/lookup-ownership-types.module';
import { LookupPeriodsModule } from './modules/lookup-periods/lookup-periods.module';
import { GradingReportsModule } from './modules/results-decisions/grading-reports/grading-reports.module';
import { MonthlyCustomComponentScoresModule } from './modules/grade-aggregation/monthly-custom-component-scores/monthly-custom-component-scores.module';
import { MonthlyGradesModule } from './modules/grade-aggregation/monthly-grades/monthly-grades.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PromotionDecisionsModule } from './modules/results-decisions/promotion-decisions/promotion-decisions.module';
import { RolesModule } from './modules/roles/roles.module';
import { SectionsModule } from './modules/sections/sections.module';
import { SemesterGradesModule } from './modules/grade-aggregation/semester-grades/semester-grades.module';
import { StudentEnrollmentsModule } from './modules/student-enrollments/student-enrollments.module';
import { StudentGuardiansModule } from './modules/student-guardians/student-guardians.module';
import { StudentProblemsModule } from './modules/student-problems/student-problems.module';
import { StudentSiblingsModule } from './modules/student-siblings/student-siblings.module';
import { StudentsModule } from './modules/students/students.module';
import { StudentAttendanceModule } from './modules/student-attendance/student-attendance.module';
import { StudentBooksModule } from './modules/student-books/student-books.module';
import { StudentHomeworksModule } from './modules/assignments/student-homeworks/student-homeworks.module';
import { StudentTalentsModule } from './modules/student-talents/student-talents.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { GradingPoliciesModule } from './modules/evaluation-policies/grading-policies/grading-policies.module';
import { GradingPolicyComponentsModule } from './modules/evaluation-policies/grading-policy-components/grading-policy-components.module';
import { ExamPeriodsModule } from './modules/exams/exam-periods/exam-periods.module';
import { ExamAssessmentsModule } from './modules/exams/exam-assessments/exam-assessments.module';
import { StudentExamScoresModule } from './modules/exams/student-exam-scores/student-exam-scores.module';
import { TimetableEntriesModule } from './modules/timetable-entries/timetable-entries.module';
import { TermSubjectOfferingsModule } from './modules/term-subject-offerings/term-subject-offerings.module';
import { TalentsModule } from './modules/talents/talents.module';
import { RemindersTickerModule } from './modules/reminders-ticker/reminders-ticker.module';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';
import { UserPermissionsModule } from './modules/user-permissions/user-permissions.module';
import { UsersModule } from './modules/users/users.module';
import { GuardiansModule } from './modules/guardians/guardians.module';
import { ParentNotificationsModule } from './modules/parent-notifications/parent-notifications.module';
import { SchoolProfilesModule } from './modules/school-profiles/school-profiles.module';
import { PrismaModule } from './prisma/prisma.module';
import { PaymentGatewaysModule } from './modules/finance/payment-gateways/payment-gateways.module';
import { PaymentTransactionsModule } from './modules/finance/payment-transactions/payment-transactions.module';
import { PaymentWebhooksModule } from './modules/finance/payment-webhooks/payment-webhooks.module';
import { BankReconciliationsModule } from './modules/finance/bank-reconciliations/bank-reconciliations.module';
import { BranchesModule } from './modules/finance/branches/branches.module';
import { CurrenciesModule } from './modules/finance/currencies/currencies.module';
import { CurrencyExchangeRatesModule } from './modules/finance/currency-exchange-rates/currency-exchange-rates.module';
import { FiscalYearsModule } from './modules/finance/fiscal-years/fiscal-years.module';
import { FiscalPeriodsModule } from './modules/finance/fiscal-periods/fiscal-periods.module';
import { ChartOfAccountsModule } from './modules/finance/chart-of-accounts/chart-of-accounts.module';
import { JournalEntriesModule } from './modules/finance/journal-entries/journal-entries.module';
import { FinancialReportsModule } from './modules/finance/financial-reports/financial-reports.module';
import { FeeStructuresModule } from './modules/finance/fee-structures/fee-structures.module';
import { DiscountRulesModule } from './modules/finance/discount-rules/discount-rules.module';
import { StudentInvoicesModule } from './modules/finance/student-invoices/student-invoices.module';
import { InvoiceInstallmentsModule } from './modules/finance/invoice-installments/invoice-installments.module';
import { TaxConfigurationsModule } from './modules/finance/tax-configurations/tax-configurations.module';
import { DocumentSequencesModule } from './modules/finance/document-sequences/document-sequences.module';
import { BillingEngineModule } from './modules/finance/billing-engine/billing-engine.module';
import { CostCentersModule } from './modules/finance/cost-centers/cost-centers.module';
import { BudgetsModule } from './modules/finance/budgets/budgets.module';
import { CreditDebitNotesModule } from './modules/finance/credit-debit-notes/credit-debit-notes.module';
import { RecurringJournalsModule } from './modules/finance/recurring-journals/recurring-journals.module';
import { HrIntegrationsModule } from './modules/finance/hr-integrations/hr-integrations.module';
import { ProcurementIntegrationsModule } from './modules/finance/procurement-integrations/procurement-integrations.module';
import { TransportIntegrationsModule } from './modules/finance/transport-integrations/transport-integrations.module';
import { AuditTrailModule } from './modules/finance/audit-trail/audit-trail.module';
import { FinancialFundsModule } from './modules/finance/financial-funds/financial-funds.module';
import { FinancialCategoriesModule } from './modules/finance/financial-categories/financial-categories.module';
import { RevenuesModule } from './modules/finance/revenues/revenues.module';
import { ExpensesModule } from './modules/finance/expenses/expenses.module';
import { CommunityContributionsModule } from './modules/finance/community-contributions/community-contributions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    AuthModule,
    AcademicYearsModule,
    AcademicTermsModule,
    AcademicMonthsModule,
    AnnualStatusesModule,
    PromotionDecisionsModule,
    GradingOutcomeRulesModule,
    GradingReportsModule,
    GradeLevelSubjectsModule,
    GradeLevelsModule,
    SectionsModule,
    SubjectsModule,
    StudentsModule,
    GuardiansModule,
    StudentGuardiansModule,
    StudentEnrollmentsModule,
    StudentAttendanceModule,
    StudentBooksModule,
    StudentTalentsModule,
    StudentSiblingsModule,
    StudentProblemsModule,
    ParentNotificationsModule,
    GradingPoliciesModule,
    GradingPolicyComponentsModule,
    ExamPeriodsModule,
    ExamAssessmentsModule,
    StudentExamScoresModule,
    MonthlyGradesModule,
    MonthlyCustomComponentScoresModule,
    SemesterGradesModule,
    AnnualGradesModule,
    AnnualResultsModule,
    HomeworkTypesModule,
    HomeworksModule,
    StudentHomeworksModule,
    HrReportsModule,
    EmployeesModule,
    TalentsModule,
    EmployeeTasksModule,
    EmployeeTalentsModule,
    EmployeeCoursesModule,
    EmployeeViolationsModule,
    EmployeeTeachingAssignmentsModule,
    EmployeeSectionSupervisionsModule,
    EmployeeAttendanceModule,
    EmployeePerformanceEvaluationsModule,
    TimetableEntriesModule,
    TermSubjectOfferingsModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    AuditLogsModule,
    GlobalSettingsModule,
    LookupBloodTypesModule,
    LookupEnrollmentStatusesModule,
    LookupOrphanStatusesModule,
    LookupAbilityLevelsModule,
    LookupActivityTypesModule,
    LookupGradeDescriptionsModule,
    LookupCatalogModule,
    LookupIdTypesModule,
    LookupOwnershipTypesModule,
    LookupPeriodsModule,
    SystemSettingsModule,
    RemindersTickerModule,
    UserPermissionsModule,
    SchoolProfilesModule,
    DataScopeModule,
    BranchesModule,
    CurrenciesModule,
    CurrencyExchangeRatesModule,
    FiscalYearsModule,
    FiscalPeriodsModule,
    ChartOfAccountsModule,
    JournalEntriesModule,
    PaymentGatewaysModule,
    PaymentTransactionsModule,
    PaymentWebhooksModule,
    BankReconciliationsModule,
    FinancialReportsModule,
    FeeStructuresModule,
    DiscountRulesModule,
    DocumentSequencesModule,
    StudentInvoicesModule,
    InvoiceInstallmentsModule,
    TaxConfigurationsModule,
    BillingEngineModule,
    CostCentersModule,
    BudgetsModule,
    CreditDebitNotesModule,
    RecurringJournalsModule,
    HrIntegrationsModule,
    ProcurementIntegrationsModule,
    TransportIntegrationsModule,
    AuditTrailModule,
    FinancialFundsModule,
    FinancialCategoriesModule,
    RevenuesModule,
    ExpensesModule,
    CommunityContributionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
