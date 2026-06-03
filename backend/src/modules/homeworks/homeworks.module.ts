import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DataScopeModule } from '../data-scope/data-scope.module';
import { ParentNotificationsModule } from '../parent-notifications/parent-notifications.module';
import { HomeworksController } from './homeworks.controller';
import { HomeworksService } from './homeworks.service';

@Module({
  imports: [AuditLogsModule, DataScopeModule, ParentNotificationsModule],
  controllers: [HomeworksController],
  providers: [HomeworksService],
  exports: [HomeworksService],
})
export class HomeworksModule {}
