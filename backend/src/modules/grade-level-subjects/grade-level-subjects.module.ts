import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { GradeLevelSubjectsController } from './grade-level-subjects.controller';
import { GradeLevelSubjectsService } from './grade-level-subjects.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [GradeLevelSubjectsController],
  providers: [GradeLevelSubjectsService],
  exports: [GradeLevelSubjectsService],
})
export class GradeLevelSubjectsModule {}
