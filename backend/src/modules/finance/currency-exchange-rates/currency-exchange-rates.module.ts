import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { CurrencyExchangeRatesController } from './currency-exchange-rates.controller';
import { CurrencyExchangeRatesService } from './currency-exchange-rates.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [CurrencyExchangeRatesController],
  providers: [CurrencyExchangeRatesService],
  exports: [CurrencyExchangeRatesService],
})
export class CurrencyExchangeRatesModule {}
