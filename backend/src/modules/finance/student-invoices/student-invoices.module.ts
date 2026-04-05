import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { StudentInvoicesController } from './student-invoices.controller';
import { StudentInvoicesService } from './student-invoices.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [StudentInvoicesController],
  providers: [StudentInvoicesService],
  exports: [StudentInvoicesService],
})
export class StudentInvoicesModule {}
