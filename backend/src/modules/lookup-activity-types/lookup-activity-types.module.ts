import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { LookupActivityTypesController } from './lookup-activity-types.controller';
import { LookupActivityTypesService } from './lookup-activity-types.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [LookupActivityTypesController],
  providers: [LookupActivityTypesService],
  exports: [LookupActivityTypesService],
})
export class LookupActivityTypesModule {}
