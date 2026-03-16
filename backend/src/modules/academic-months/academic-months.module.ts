import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AcademicMonthsController } from './academic-months.controller';
import { AcademicMonthsService } from './academic-months.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [AcademicMonthsController],
  providers: [AcademicMonthsService],
  exports: [AcademicMonthsService],
})
export class AcademicMonthsModule {}
