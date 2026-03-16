import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { LookupIdTypesController } from './lookup-id-types.controller';
import { LookupIdTypesService } from './lookup-id-types.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [LookupIdTypesController],
  providers: [LookupIdTypesService],
  exports: [LookupIdTypesService],
})
export class LookupIdTypesModule {}
