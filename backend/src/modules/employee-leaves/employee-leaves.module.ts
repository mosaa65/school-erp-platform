import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeesModule } from '../employees/employees.module';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';
import { EmployeeLeavesController } from './employee-leaves.controller';
import { EmployeeLeavesService } from './employee-leaves.service';

@Module({
  imports: [AuditLogsModule, EmployeesModule, UserNotificationsModule],
  controllers: [EmployeeLeavesController],
  providers: [EmployeeLeavesService],
})
export class EmployeeLeavesModule {}
