import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DataScopeModule } from '../data-scope/data-scope.module';
import { StudentExamScoresController } from './student-exam-scores.controller';
import { StudentExamScoresService } from './student-exam-scores.service';

@Module({
  imports: [AuditLogsModule, DataScopeModule],
  controllers: [StudentExamScoresController],
  providers: [StudentExamScoresService],
  exports: [StudentExamScoresService],
})
export class StudentExamScoresModule {}
