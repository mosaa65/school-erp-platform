import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { TaxConfigurationsController } from './tax-configurations.controller';
import { TaxConfigurationsService } from './tax-configurations.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [TaxConfigurationsController],
  providers: [TaxConfigurationsService],
  exports: [TaxConfigurationsService],
})
export class TaxConfigurationsModule {}
