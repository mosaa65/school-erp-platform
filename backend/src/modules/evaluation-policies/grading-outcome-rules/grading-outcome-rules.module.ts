import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { GradingOutcomeRulesController } from './grading-outcome-rules.controller';
import { GradingOutcomeRulesService } from './grading-outcome-rules.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [GradingOutcomeRulesController],
  providers: [GradingOutcomeRulesService],
  exports: [GradingOutcomeRulesService],
})
export class GradingOutcomeRulesModule {}
