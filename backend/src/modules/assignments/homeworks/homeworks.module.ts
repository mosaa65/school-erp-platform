import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { ParentNotificationsModule } from '../../parent-notifications/parent-notifications.module';
import { DataScopeModule } from '../../teaching-assignments/data-scope/data-scope.module';
import { HomeworksController } from './homeworks.controller';
import { HomeworksService } from './homeworks.service';

@Module({
  imports: [AuditLogsModule, DataScopeModule, ParentNotificationsModule],
  controllers: [HomeworksController],
  providers: [HomeworksService],
  exports: [HomeworksService],
})
export class HomeworksModule {}
