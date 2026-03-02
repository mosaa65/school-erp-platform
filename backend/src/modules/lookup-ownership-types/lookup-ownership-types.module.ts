import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { LookupOwnershipTypesController } from './lookup-ownership-types.controller';
import { LookupOwnershipTypesService } from './lookup-ownership-types.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [LookupOwnershipTypesController],
  providers: [LookupOwnershipTypesService],
  exports: [LookupOwnershipTypesService],
})
export class LookupOwnershipTypesModule {}
