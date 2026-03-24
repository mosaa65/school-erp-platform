import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { HrIntegrationsController } from './hr-integrations.controller';
import { HrIntegrationsService } from './hr-integrations.service';

@Module({
  imports: [AuditLogsModule, DocumentSequencesModule],
  controllers: [HrIntegrationsController],
  providers: [HrIntegrationsService],
})
export class HrIntegrationsModule {}
