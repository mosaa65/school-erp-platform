import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { ExamAssessmentsController } from './exam-assessments.controller';
import { ExamAssessmentsService } from './exam-assessments.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [ExamAssessmentsController],
  providers: [ExamAssessmentsService],
  exports: [ExamAssessmentsService],
})
export class ExamAssessmentsModule {}
