import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeeDepartmentsController } from './employee-departments.controller';
import { EmployeeDepartmentsService } from './employee-departments.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [EmployeeDepartmentsController],
  providers: [EmployeeDepartmentsService],
  exports: [EmployeeDepartmentsService],
})
export class EmployeeDepartmentsModule {}
