import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MonthlyGradesController } from './monthly-grades.controller';
import { MonthlyGradesService } from './monthly-grades.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [MonthlyGradesController],
  providers: [MonthlyGradesService],
  exports: [MonthlyGradesService],
})
export class MonthlyGradesModule {}
