import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { AssessmentComponentSourcePeriodsController } from './assessment-component-source-periods.controller';
import { AssessmentComponentSourcePeriodsService } from './assessment-component-source-periods.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [AssessmentComponentSourcePeriodsController],
  providers: [AssessmentComponentSourcePeriodsService],
  exports: [AssessmentComponentSourcePeriodsService],
})
export class AssessmentComponentSourcePeriodsModule {}
