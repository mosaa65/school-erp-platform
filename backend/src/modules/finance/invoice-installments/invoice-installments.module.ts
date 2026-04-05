import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { InvoiceInstallmentsController } from './invoice-installments.controller';
import { InvoiceInstallmentsService } from './invoice-installments.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [InvoiceInstallmentsController],
  providers: [InvoiceInstallmentsService],
  exports: [InvoiceInstallmentsService],
})
export class InvoiceInstallmentsModule {}
