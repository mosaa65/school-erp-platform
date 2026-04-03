import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { PaymentTransactionsModule } from '../payment-transactions/payment-transactions.module';
import { StudentInvoicesModule } from '../student-invoices/student-invoices.module';
import { CommunityContributionsController } from './community-contributions.controller';
import { CommunityContributionsService } from './community-contributions.service';

@Module({
  imports: [AuditLogsModule, StudentInvoicesModule, PaymentTransactionsModule],
  controllers: [CommunityContributionsController],
  providers: [CommunityContributionsService],
})
export class CommunityContributionsModule {}
