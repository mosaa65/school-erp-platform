import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { StudentPeriodResultsController } from './student-period-results.controller';
import { StudentPeriodResultsService } from './student-period-results.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [StudentPeriodResultsController],
  providers: [StudentPeriodResultsService],
  exports: [StudentPeriodResultsService],
})
export class StudentPeriodResultsModule {}
