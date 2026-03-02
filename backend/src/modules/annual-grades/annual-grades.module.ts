import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AnnualGradesController } from './annual-grades.controller';
import { AnnualGradesService } from './annual-grades.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [AnnualGradesController],
  providers: [AnnualGradesService],
  exports: [AnnualGradesService],
})
export class AnnualGradesModule {}
