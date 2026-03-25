import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DataScopeModule } from '../data-scope/data-scope.module';
import { GradingPoliciesModule } from '../evaluation-policies/grading-policies/grading-policies.module';
import { SemesterGradesController } from './semester-grades.controller';
import { SemesterGradesService } from './semester-grades.service';

@Module({
  imports: [AuditLogsModule, DataScopeModule, GradingPoliciesModule],
  controllers: [SemesterGradesController],
  providers: [SemesterGradesService],
  exports: [SemesterGradesService],
})
export class SemesterGradesModule {}
