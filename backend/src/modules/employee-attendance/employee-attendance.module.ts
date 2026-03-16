import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeesModule } from '../employees/employees.module';
import { EmployeeAttendanceController } from './employee-attendance.controller';
import { EmployeeAttendanceService } from './employee-attendance.service';

@Module({
  imports: [AuditLogsModule, EmployeesModule],
  controllers: [EmployeeAttendanceController],
  providers: [EmployeeAttendanceService],
})
export class EmployeeAttendanceModule {}
