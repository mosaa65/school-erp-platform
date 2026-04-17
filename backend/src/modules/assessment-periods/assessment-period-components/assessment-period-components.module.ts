import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { AssessmentPeriodComponentsController } from './assessment-period-components.controller';
import { AssessmentPeriodComponentsService } from './assessment-period-components.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [AssessmentPeriodComponentsController],
  providers: [AssessmentPeriodComponentsService],
  exports: [AssessmentPeriodComponentsService],
})
export class AssessmentPeriodComponentsModule {}
