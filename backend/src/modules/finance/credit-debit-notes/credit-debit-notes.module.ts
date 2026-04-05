import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { CreditDebitNotesController } from './credit-debit-notes.controller';
import { CreditDebitNotesService } from './credit-debit-notes.service';

@Module({
  imports: [AuditLogsModule, DocumentSequencesModule],
  controllers: [CreditDebitNotesController],
  providers: [CreditDebitNotesService],
  exports: [CreditDebitNotesService],
})
export class CreditDebitNotesModule {}
