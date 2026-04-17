import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AcademicMonthsModule } from './modules/academic-months/academic-months.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { ExamsModule } from './modules/exams/exams.module';
import { AcademicTermsModule } from './modules/academic-terms/academic-terms.module';
import { AcademicYearsModule } from './modules/academic-years/academic-years.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { EmployeeAttendanceModule } from './modules/employee-attendance/employee-attendance.module';
import { EmployeeDocumentsModule } from './modules/employee-documents/employee-documents.module';
import { EmployeeDepartmentsModule } from './modules/employee-departments/employee-departments.module';
import { EmployeeLeaveBalancesModule } from './modules/employee-leave-balances/employee-leave-balances.module';
import { EmployeeLeavesModule } from './modules/employee-leaves/employee-leaves.module';
import { EmployeeLifecycleChecklistsModule } from './modules/employee-lifecycle-checklists/employee-lifecycle-checklists.module';
import { EmployeeContractsModule } from './modules/employee-contracts/employee-contracts.module';
import { EmployeeCoursesModule } from './modules/employee-courses/employee-courses.module';
import { EmployeePerformanceEvaluationsModule } from './modules/employee-performance-evaluations/employee-performance-evaluations.module';
import { EmployeeTasksModule } from './modules/employee-tasks/employee-tasks.module';
import { EmployeeTalentsModule } from './modules/employee-talents/employee-talents.module';
import { EmployeeViolationsModule } from './modules/employee-violations/employee-violations.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { GradeLevelSubjectsModule } from './modules/grade-level-subjects/grade-level-subjects.module';
import { GradeLevelsModule } from './modules/grade-levels/grade-levels.module';
import { GlobalSettingsModule } from './modules/global-settings/global-settings.module';
import { HrReportsModule } from './modules/hr-reports/hr-reports.module';
import { ClassroomsModule } from './modules/classrooms/classrooms.module';
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
import { TalentsModule } from './modules/talents/talents.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { SectionClassroomAssignmentsModule } from './modules/section-classroom-assignments/section-classroom-assignments.module';
import { SectionsModule } from './modules/sections/sections.module';
import { StudentEnrollmentsModule } from './modules/student-enrollments/student-enrollments.module';
import { StudentGuardiansModule } from './modules/student-guardians/student-guardians.module';
import { StudentProblemsModule } from './modules/student-problems/student-problems.module';
import { HealthVisitsModule } from './modules/health-visits/health-visits.module';
import { StudentSiblingsModule } from './modules/student-siblings/student-siblings.module';
import { StudentsModule } from './modules/students/students.module';
import { StudentAttendanceModule } from './modules/student-attendance/student-attendance.module';
import { StudentBooksModule } from './modules/student-books/student-books.module';
import { StudentTalentsModule } from './modules/student-talents/student-talents.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { TimetableEntriesModule } from './modules/timetable-entries/timetable-entries.module';
import { TeachingAssignmentsModule } from './modules/teaching-assignments/teaching-assignments.module';
import { TermSubjectOfferingsModule } from './modules/term-subject-offerings/term-subject-offerings.module';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';
import { RemindersTickerModule } from './modules/reminders-ticker/reminders-ticker.module';
import { UserPermissionsModule } from './modules/user-permissions/user-permissions.module';
import { UsersModule } from './modules/users/users.module';
import { GuardiansModule } from './modules/guardians/guardians.module';
import { ParentNotificationsModule } from './modules/parent-notifications/parent-notifications.module';
import { SchoolProfilesModule } from './modules/school-profiles/school-profiles.module';
import { UserNotificationsModule } from './modules/user-notifications/user-notifications.module';
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
import { EvaluationPoliciesModule } from './modules/evaluation-policies/evaluation-policies.module';
import { ResultsDecisionsModule } from './modules/results-decisions/results-decisions.module';
import { AssessmentPeriodsModule } from './modules/assessment-periods/assessment-periods.module';
import { MonthlyAssessmentModule } from './modules/monthly-assessment/monthly-assessment.module';

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
    GradeLevelSubjectsModule,
    GradeLevelsModule,
    ClassroomsModule,
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
    HealthVisitsModule,
    ParentNotificationsModule,
    ExamsModule,
    AssignmentsModule,
    EvaluationPoliciesModule,
    ResultsDecisionsModule,
    AssessmentPeriodsModule,
    MonthlyAssessmentModule,
    HrReportsModule,
    EmployeesModule,
    TalentsModule,
    EmployeeTasksModule,
    EmployeeTalentsModule,
    EmployeeCoursesModule,
    EmployeeViolationsModule,
    TeachingAssignmentsModule,
    EmployeeAttendanceModule,
    EmployeeDocumentsModule,
    EmployeeDepartmentsModule,
    EmployeeLeaveBalancesModule,
    EmployeeLeavesModule,
    EmployeeLifecycleChecklistsModule,
    EmployeeContractsModule,
    EmployeePerformanceEvaluationsModule,
    TimetableEntriesModule,
    TermSubjectOfferingsModule,
    UsersModule,
    RolesModule,
    SectionClassroomAssignmentsModule,
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
    UserNotificationsModule,
    SchoolProfilesModule,
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
