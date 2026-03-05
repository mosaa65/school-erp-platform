import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { LookupOrphanStatusesController } from './lookup-orphan-statuses.controller';
import { LookupOrphanStatusesService } from './lookup-orphan-statuses.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [LookupOrphanStatusesController],
  providers: [LookupOrphanStatusesService],
  exports: [LookupOrphanStatusesService],
})
export class LookupOrphanStatusesModule {}
