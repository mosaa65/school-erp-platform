import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { TransportIntegrationsController } from './transport-integrations.controller';
import { TransportIntegrationsService } from './transport-integrations.service';

@Module({
  imports: [AuditLogsModule, DocumentSequencesModule],
  controllers: [TransportIntegrationsController],
  providers: [TransportIntegrationsService],
})
export class TransportIntegrationsModule {}
