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
    HrReportsModule,
    EmployeesModule,
    TalentsModule,
    EmployeeTasksModule,
    EmployeeTalentsModule,
    EmployeeCoursesModule,
    EmployeeViolationsModule,
    TeachingAssignmentsModule,
    EmployeeAttendanceModule,
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
    SchoolProfilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
