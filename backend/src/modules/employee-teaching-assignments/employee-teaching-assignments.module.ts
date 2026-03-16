import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeesModule } from '../employees/employees.module';
import { EmployeeTeachingAssignmentsController } from './employee-teaching-assignments.controller';
import { EmployeeTeachingAssignmentsService } from './employee-teaching-assignments.service';

@Module({
  imports: [AuditLogsModule, EmployeesModule],
  controllers: [EmployeeTeachingAssignmentsController],
  providers: [EmployeeTeachingAssignmentsService],
})
export class EmployeeTeachingAssignmentsModule {}
