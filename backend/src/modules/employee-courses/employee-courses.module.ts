import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeesModule } from '../employees/employees.module';
import { EmployeeCoursesController } from './employee-courses.controller';
import { EmployeeCoursesService } from './employee-courses.service';

@Module({
  imports: [AuditLogsModule, EmployeesModule],
  controllers: [EmployeeCoursesController],
  providers: [EmployeeCoursesService],
})
export class EmployeeCoursesModule {}
