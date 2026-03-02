import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeesModule } from '../employees/employees.module';
import { EmployeeTasksController } from './employee-tasks.controller';
import { EmployeeTasksService } from './employee-tasks.service';

@Module({
  imports: [AuditLogsModule, EmployeesModule],
  controllers: [EmployeeTasksController],
  providers: [EmployeeTasksService],
})
export class EmployeeTasksModule {}
