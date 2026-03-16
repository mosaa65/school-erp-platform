import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { LookupCatalogController } from './lookup-catalog.controller';
import { LookupCatalogService } from './lookup-catalog.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [LookupCatalogController],
  providers: [LookupCatalogService],
  exports: [LookupCatalogService],
})
export class LookupCatalogModule {}
