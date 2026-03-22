import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { GradingPoliciesModule } from '../../evaluation-policies/grading-policies/grading-policies.module';
import { DataScopeModule } from '../../teaching-assignments/data-scope/data-scope.module';
import { AnnualResultsController } from './annual-results.controller';
import { AnnualResultsService } from './annual-results.service';

@Module({
  imports: [AuditLogsModule, GradingPoliciesModule, DataScopeModule],
  controllers: [AnnualResultsController],
  providers: [AnnualResultsService],
  exports: [AnnualResultsService],
})
export class AnnualResultsModule {}
