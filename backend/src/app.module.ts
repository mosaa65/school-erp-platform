import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AcademicMonthsModule } from './modules/academic-months/academic-months.module';
import { AnnualGradesModule } from './modules/annual-grades/annual-grades.module';
import { AnnualResultsModule } from './modules/annual-results/annual-results.module';
import { AnnualStatusesModule } from './modules/annual-statuses/annual-statuses.module';
import { AcademicTermsModule } from './modules/academic-terms/academic-terms.module';
import { AcademicYearsModule } from './modules/academic-years/academic-years.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { EmployeeAttendanceModule } from './modules/employee-attendance/employee-attendance.module';
import { EmployeeCoursesModule } from './modules/employee-courses/employee-courses.module';
import { EmployeePerformanceEvaluationsModule } from './modules/employee-performance-evaluations/employee-performance-evaluations.module';
import { EmployeeSectionSupervisionsModule } from './modules/employee-section-supervisions/employee-section-supervisions.module';
import { EmployeeTasksModule } from './modules/employee-tasks/employee-tasks.module';
import { EmployeeTalentsModule } from './modules/employee-talents/employee-talents.module';
import { EmployeeTeachingAssignmentsModule } from './modules/employee-teaching-assignments/employee-teaching-assignments.module';
import { EmployeeViolationsModule } from './modules/employee-violations/employee-violations.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DataScopeModule } from './modules/data-scope/data-scope.module';
import { GradeLevelSubjectsModule } from './modules/grade-level-subjects/grade-level-subjects.module';
import { GradeLevelsModule } from './modules/grade-levels/grade-levels.module';
import { GlobalSettingsModule } from './modules/global-settings/global-settings.module';
import { GradingOutcomeRulesModule } from './modules/grading-outcome-rules/grading-outcome-rules.module';
import { HomeworkTypesModule } from './modules/homework-types/homework-types.module';
import { HomeworksModule } from './modules/homeworks/homeworks.module';
import { HrReportsModule } from './modules/hr-reports/hr-reports.module';
import { LookupBloodTypesModule } from './modules/lookup-blood-types/lookup-blood-types.module';
import { LookupEnrollmentStatusesModule } from './modules/lookup-enrollment-statuses/lookup-enrollment-statuses.module';
import { LookupCatalogModule } from './modules/lookup-catalog/lookup-catalog.module';
import { LookupIdTypesModule } from './modules/lookup-id-types/lookup-id-types.module';
import { LookupOrphanStatusesModule } from './modules/lookup-orphan-statuses/lookup-orphan-statuses.module';
import { LookupAbilityLevelsModule } from './modules/lookup-ability-levels/lookup-ability-levels.module';
import { LookupActivityTypesModule } from './modules/lookup-activity-types/lookup-activity-types.module';
import { LookupOwnershipTypesModule } from './modules/lookup-ownership-types/lookup-ownership-types.module';
import { LookupPeriodsModule } from './modules/lookup-periods/lookup-periods.module';
import { GradingReportsModule } from './modules/grading-reports/grading-reports.module';
import { MonthlyCustomComponentScoresModule } from './modules/monthly-custom-component-scores/monthly-custom-component-scores.module';
import { MonthlyGradesModule } from './modules/monthly-grades/monthly-grades.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PromotionDecisionsModule } from './modules/promotion-decisions/promotion-decisions.module';
import { RolesModule } from './modules/roles/roles.module';
import { SectionsModule } from './modules/sections/sections.module';
import { SemesterGradesModule } from './modules/semester-grades/semester-grades.module';
import { StudentEnrollmentsModule } from './modules/student-enrollments/student-enrollments.module';
import { StudentGuardiansModule } from './modules/student-guardians/student-guardians.module';
import { StudentsModule } from './modules/students/students.module';
import { StudentAttendanceModule } from './modules/student-attendance/student-attendance.module';
import { StudentBooksModule } from './modules/student-books/student-books.module';
import { StudentHomeworksModule } from './modules/student-homeworks/student-homeworks.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { GradingPoliciesModule } from './modules/grading-policies/grading-policies.module';
import { ExamPeriodsModule } from './modules/exam-periods/exam-periods.module';
import { ExamAssessmentsModule } from './modules/exam-assessments/exam-assessments.module';
import { StudentExamScoresModule } from './modules/student-exam-scores/student-exam-scores.module';
import { TimetableEntriesModule } from './modules/timetable-entries/timetable-entries.module';
import { TermSubjectOfferingsModule } from './modules/term-subject-offerings/term-subject-offerings.module';
import { TalentsModule } from './modules/talents/talents.module';
import { RemindersTickerModule } from './modules/reminders-ticker/reminders-ticker.module';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';
import { UserPermissionsModule } from './modules/user-permissions/user-permissions.module';
import { UsersModule } from './modules/users/users.module';
import { GuardiansModule } from './modules/guardians/guardians.module';
import { SchoolProfilesModule } from './modules/school-profiles/school-profiles.module';
import { PrismaModule } from './prisma/prisma.module';

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
    GradingPoliciesModule,
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
    LookupCatalogModule,
    LookupIdTypesModule,
    LookupOwnershipTypesModule,
    LookupPeriodsModule,
    SystemSettingsModule,
    RemindersTickerModule,
    UserPermissionsModule,
    SchoolProfilesModule,
    DataScopeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
