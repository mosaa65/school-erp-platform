import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { FiscalPeriodsController } from './fiscal-periods.controller';
import { FiscalPeriodsService } from './fiscal-periods.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [FiscalPeriodsController],
  providers: [FiscalPeriodsService],
  exports: [FiscalPeriodsService],
})
export class FiscalPeriodsModule {}
