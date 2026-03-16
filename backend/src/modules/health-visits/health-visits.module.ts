import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeesModule } from '../employees/employees.module';
import { StudentsModule } from '../students/students.module';
import { HealthVisitsController } from './health-visits.controller';
import { HealthVisitsService } from './health-visits.service';

@Module({
  imports: [AuditLogsModule, StudentsModule, EmployeesModule],
  controllers: [HealthVisitsController],
  providers: [HealthVisitsService],
  exports: [HealthVisitsService],
})
export class HealthVisitsModule {}
