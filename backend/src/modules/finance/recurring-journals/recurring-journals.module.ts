import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { RecurringJournalsController } from './recurring-journals.controller';
import { RecurringJournalsSchedulerService } from './recurring-journals.scheduler';
import { RecurringJournalsService } from './recurring-journals.service';

@Module({
  imports: [AuditLogsModule, DocumentSequencesModule],
  controllers: [RecurringJournalsController],
  providers: [RecurringJournalsService, RecurringJournalsSchedulerService],
  exports: [RecurringJournalsService],
})
export class RecurringJournalsModule {}
