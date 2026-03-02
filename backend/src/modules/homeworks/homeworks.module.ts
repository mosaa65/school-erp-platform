import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { HomeworksController } from './homeworks.controller';
import { HomeworksService } from './homeworks.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [HomeworksController],
  providers: [HomeworksService],
  exports: [HomeworksService],
})
export class HomeworksModule {}
