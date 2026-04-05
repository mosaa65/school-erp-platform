import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeesModule } from '../employees/employees.module';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';
import { EmployeeDocumentsController } from './employee-documents.controller';
import { EmployeeDocumentsService } from './employee-documents.service';

@Module({
  imports: [AuditLogsModule, EmployeesModule, UserNotificationsModule],
  controllers: [EmployeeDocumentsController],
  providers: [EmployeeDocumentsService],
})
export class EmployeeDocumentsModule {}
