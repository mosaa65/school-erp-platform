import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { AssessmentPeriodsController } from './assessment-periods.controller';
import { AssessmentPeriodsService } from './assessment-periods.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [AssessmentPeriodsController],
  providers: [AssessmentPeriodsService],
  exports: [AssessmentPeriodsService],
})
export class AssessmentPeriodsResourceModule {}
