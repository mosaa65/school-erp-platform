import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { MonthlyCustomComponentScoresController } from './monthly-custom-component-scores.controller';
import { MonthlyCustomComponentScoresService } from './monthly-custom-component-scores.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [MonthlyCustomComponentScoresController],
  providers: [MonthlyCustomComponentScoresService],
  exports: [MonthlyCustomComponentScoresService],
})
export class MonthlyCustomComponentScoresModule {}
