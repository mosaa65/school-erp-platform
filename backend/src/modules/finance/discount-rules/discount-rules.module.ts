import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { DiscountRulesController } from './discount-rules.controller';
import { DiscountRulesService } from './discount-rules.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [DiscountRulesController],
  providers: [DiscountRulesService],
  exports: [DiscountRulesService],
})
export class DiscountRulesModule {}
