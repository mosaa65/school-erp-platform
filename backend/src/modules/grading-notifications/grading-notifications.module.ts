import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { GradingNotificationsService } from './grading-notifications.service';

@Module({
  imports: [AuditLogsModule],
  providers: [GradingNotificationsService],
  exports: [GradingNotificationsService],
})
export class GradingNotificationsModule {}