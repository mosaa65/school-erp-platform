import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeesModule } from '../employees/employees.module';
import { EmployeeSectionSupervisionsController } from './employee-section-supervisions.controller';
import { EmployeeSectionSupervisionsService } from './employee-section-supervisions.service';

@Module({
  imports: [AuditLogsModule, EmployeesModule],
  controllers: [EmployeeSectionSupervisionsController],
  providers: [EmployeeSectionSupervisionsService],
  exports: [EmployeeSectionSupervisionsService],
})
export class EmployeeSectionSupervisionsModule {}
