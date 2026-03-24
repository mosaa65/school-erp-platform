import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { GradingPoliciesModule } from '../../evaluation-policies/grading-policies/grading-policies.module';
import { DataScopeModule } from '../../teaching-assignments/data-scope/data-scope.module';
import { AnnualGradesController } from './annual-grades.controller';
import { AnnualGradesService } from './annual-grades.service';

@Module({
  imports: [AuditLogsModule, GradingPoliciesModule, DataScopeModule],
  controllers: [AnnualGradesController],
  providers: [AnnualGradesService],
  exports: [AnnualGradesService],
})
export class AnnualGradesModule {}
