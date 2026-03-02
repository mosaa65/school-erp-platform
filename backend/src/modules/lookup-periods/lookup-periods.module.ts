import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { LookupPeriodsController } from './lookup-periods.controller';
import { LookupPeriodsService } from './lookup-periods.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [LookupPeriodsController],
  providers: [LookupPeriodsService],
  exports: [LookupPeriodsService],
})
export class LookupPeriodsModule {}
