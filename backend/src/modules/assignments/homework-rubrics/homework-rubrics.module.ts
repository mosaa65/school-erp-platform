import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { HomeworkRubricsController } from './homework-rubrics.controller';
import { HomeworkRubricsService } from './homework-rubrics.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [HomeworkRubricsController],
  providers: [HomeworkRubricsService],
  exports: [HomeworkRubricsService],
})
export class HomeworkRubricsModule {}
