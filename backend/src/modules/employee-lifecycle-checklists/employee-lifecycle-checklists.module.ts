import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeesModule } from '../employees/employees.module';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';
import { EmployeeLifecycleChecklistsController } from './employee-lifecycle-checklists.controller';
import { EmployeeLifecycleChecklistsService } from './employee-lifecycle-checklists.service';

@Module({
  imports: [AuditLogsModule, EmployeesModule, UserNotificationsModule],
  controllers: [EmployeeLifecycleChecklistsController],
  providers: [EmployeeLifecycleChecklistsService],
})
export class EmployeeLifecycleChecklistsModule {}
