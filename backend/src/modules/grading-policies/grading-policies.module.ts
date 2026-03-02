import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { GradingPoliciesController } from './grading-policies.controller';
import { GradingPoliciesService } from './grading-policies.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [GradingPoliciesController],
  providers: [GradingPoliciesService],
  exports: [GradingPoliciesService],
})
export class GradingPoliciesModule {}
