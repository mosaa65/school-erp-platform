import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StudentsModule } from '../students/students.module';
import { ParentNotificationsController } from './parent-notifications.controller';
import { ParentNotificationsService } from './parent-notifications.service';

@Module({
  imports: [AuditLogsModule, StudentsModule],
  controllers: [ParentNotificationsController],
  providers: [ParentNotificationsService],
})
export class ParentNotificationsModule {}
