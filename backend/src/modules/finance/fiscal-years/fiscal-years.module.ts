import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { FiscalYearsController } from './fiscal-years.controller';
import { FiscalYearsService } from './fiscal-years.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [FiscalYearsController],
  providers: [FiscalYearsService],
  exports: [FiscalYearsService],
})
export class FiscalYearsModule {}
