import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { CreditDebitNotesModule } from '../credit-debit-notes/credit-debit-notes.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { BillingEngineController } from './billing-engine.controller';
import { BillingEngineService } from './billing-engine.service';

@Module({
  imports: [AuditLogsModule, CreditDebitNotesModule, DocumentSequencesModule],
  controllers: [BillingEngineController],
  providers: [BillingEngineService],
  exports: [BillingEngineService],
})
export class BillingEngineModule {}
