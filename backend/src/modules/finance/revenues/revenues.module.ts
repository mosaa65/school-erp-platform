import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { RevenuesController } from './revenues.controller';
import { RevenuesService } from './revenues.service';

@Module({
  imports: [AuditLogsModule, DocumentSequencesModule],
  controllers: [RevenuesController],
  providers: [RevenuesService],
})
export class RevenuesModule {}
