import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AnnualStatusesController } from './annual-statuses.controller';
import { AnnualStatusesService } from './annual-statuses.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [AnnualStatusesController],
  providers: [AnnualStatusesService],
  exports: [AnnualStatusesService],
})
export class AnnualStatusesModule {}
