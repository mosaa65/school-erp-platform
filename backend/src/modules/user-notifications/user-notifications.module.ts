import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { UserNotificationsController } from './user-notifications.controller';
import { UserNotificationsService } from './user-notifications.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [UserNotificationsController],
  providers: [UserNotificationsService],
  exports: [UserNotificationsService],
})
export class UserNotificationsModule {}
