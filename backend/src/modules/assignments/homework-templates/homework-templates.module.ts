import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { HomeworkTemplatesController } from './homework-templates.controller';
import { HomeworkTemplatesService } from './homework-templates.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [HomeworkTemplatesController],
  providers: [HomeworkTemplatesService],
  exports: [HomeworkTemplatesService],
})
export class HomeworkTemplatesModule {}
