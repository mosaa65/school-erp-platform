import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ExamPeriodsController } from './exam-periods.controller';
import { ExamPeriodsService } from './exam-periods.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [ExamPeriodsController],
  providers: [ExamPeriodsService],
  exports: [ExamPeriodsService],
})
export class ExamPeriodsModule {}
