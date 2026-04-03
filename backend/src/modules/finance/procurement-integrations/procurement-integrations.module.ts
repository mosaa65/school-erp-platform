import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { InventoryIntegrationsController } from './inventory-integrations.controller';
import { ProcurementIntegrationsController } from './procurement-integrations.controller';
import { ProcurementIntegrationsService } from './procurement-integrations.service';

@Module({
  imports: [AuditLogsModule, DocumentSequencesModule],
  controllers: [ProcurementIntegrationsController, InventoryIntegrationsController],
  providers: [ProcurementIntegrationsService],
})
export class ProcurementIntegrationsModule {}
