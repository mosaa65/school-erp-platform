import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { FinancialCategoriesController } from './financial-categories.controller';
import { FinancialCategoriesService } from './financial-categories.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [FinancialCategoriesController],
  providers: [FinancialCategoriesService],
  exports: [FinancialCategoriesService],
})
export class FinancialCategoriesModule {}
