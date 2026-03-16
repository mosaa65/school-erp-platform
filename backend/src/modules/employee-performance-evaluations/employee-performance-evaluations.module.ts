import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeesModule } from '../employees/employees.module';
import { EmployeePerformanceEvaluationsController } from './employee-performance-evaluations.controller';
import { EmployeePerformanceEvaluationsService } from './employee-performance-evaluations.service';

@Module({
  imports: [AuditLogsModule, EmployeesModule],
  controllers: [EmployeePerformanceEvaluationsController],
  providers: [EmployeePerformanceEvaluationsService],
})
export class EmployeePerformanceEvaluationsModule {}
