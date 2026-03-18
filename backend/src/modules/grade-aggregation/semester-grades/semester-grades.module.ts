import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { GradingPoliciesModule } from '../../evaluation-policies/grading-policies/grading-policies.module';
import { DataScopeModule } from '../../teaching-assignments/data-scope/data-scope.module';
import { SemesterGradesController } from './semester-grades.controller';
import { SemesterGradesService } from './semester-grades.service';

@Module({
  imports: [AuditLogsModule, GradingPoliciesModule, DataScopeModule],
  controllers: [SemesterGradesController],
  providers: [SemesterGradesService],
  exports: [SemesterGradesService],
})
export class SemesterGradesModule {}
