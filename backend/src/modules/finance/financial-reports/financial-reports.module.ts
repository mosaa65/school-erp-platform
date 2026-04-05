import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { FinancialReportsController } from './financial-reports.controller';
import { FinancialReportsService } from './financial-reports.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [FinancialReportsController],
  providers: [FinancialReportsService],
  exports: [FinancialReportsService],
})
export class FinancialReportsModule {}
