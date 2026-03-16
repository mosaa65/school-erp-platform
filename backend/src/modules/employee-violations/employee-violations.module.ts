import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeesModule } from '../employees/employees.module';
import { EmployeeViolationsController } from './employee-violations.controller';
import { EmployeeViolationsService } from './employee-violations.service';

@Module({
  imports: [AuditLogsModule, EmployeesModule],
  controllers: [EmployeeViolationsController],
  providers: [EmployeeViolationsService],
})
export class EmployeeViolationsModule {}
