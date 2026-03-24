import { Module } from '@nestjs/common';
import { DataScopeModule } from './data-scope/data-scope.module';
import { EmployeeSectionSupervisionsModule } from './employee-section-supervisions/employee-section-supervisions.module';
import { EmployeeTeachingAssignmentsModule } from './employee-teaching-assignments/employee-teaching-assignments.module';

@Module({
  imports: [
    EmployeeTeachingAssignmentsModule,
    EmployeeSectionSupervisionsModule,
    DataScopeModule,
  ],
  exports: [
    EmployeeTeachingAssignmentsModule,
    EmployeeSectionSupervisionsModule,
    DataScopeModule,
  ],
})
export class TeachingAssignmentsModule {}
