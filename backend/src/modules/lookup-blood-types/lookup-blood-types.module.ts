import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { LookupBloodTypesController } from './lookup-blood-types.controller';
import { LookupBloodTypesService } from './lookup-blood-types.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [LookupBloodTypesController],
  providers: [LookupBloodTypesService],
  exports: [LookupBloodTypesService],
})
export class LookupBloodTypesModule {}
