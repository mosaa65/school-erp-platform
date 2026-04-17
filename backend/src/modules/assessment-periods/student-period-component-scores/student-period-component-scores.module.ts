import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { StudentPeriodComponentScoresController } from './student-period-component-scores.controller';
import { StudentPeriodComponentScoresService } from './student-period-component-scores.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [StudentPeriodComponentScoresController],
  providers: [StudentPeriodComponentScoresService],
  exports: [StudentPeriodComponentScoresService],
})
export class StudentPeriodComponentScoresModule {}
