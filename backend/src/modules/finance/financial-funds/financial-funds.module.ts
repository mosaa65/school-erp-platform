import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { FinancialFundsController } from './financial-funds.controller';
import { FinancialFundsService } from './financial-funds.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [FinancialFundsController],
  providers: [FinancialFundsService],
  exports: [FinancialFundsService],
})
export class FinancialFundsModule {}
