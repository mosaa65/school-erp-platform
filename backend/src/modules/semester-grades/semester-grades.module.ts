import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { SemesterGradesController } from './semester-grades.controller';
import { SemesterGradesService } from './semester-grades.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [SemesterGradesController],
  providers: [SemesterGradesService],
  exports: [SemesterGradesService],
})
export class SemesterGradesModule {}
