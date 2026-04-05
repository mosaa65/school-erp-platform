import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeesModule } from '../employees/employees.module';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';
import { EmployeeContractsController } from './employee-contracts.controller';
import { EmployeeContractsService } from './employee-contracts.service';

@Module({
  imports: [AuditLogsModule, EmployeesModule, UserNotificationsModule],
  controllers: [EmployeeContractsController],
  providers: [EmployeeContractsService],
})
export class EmployeeContractsModule {}
