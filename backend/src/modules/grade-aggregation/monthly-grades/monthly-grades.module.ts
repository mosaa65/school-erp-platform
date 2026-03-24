import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { GradingPoliciesModule } from '../../evaluation-policies/grading-policies/grading-policies.module';
import { DataScopeModule } from '../../teaching-assignments/data-scope/data-scope.module';
import { MonthlyGradesController } from './monthly-grades.controller';
import { MonthlyGradesService } from './monthly-grades.service';

@Module({
  imports: [AuditLogsModule, GradingPoliciesModule, DataScopeModule],
  controllers: [MonthlyGradesController],
  providers: [MonthlyGradesService],
  exports: [MonthlyGradesService],
})
export class MonthlyGradesModule {}
