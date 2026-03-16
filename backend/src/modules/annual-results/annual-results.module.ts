import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AnnualResultsController } from './annual-results.controller';
import { AnnualResultsService } from './annual-results.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [AnnualResultsController],
  providers: [AnnualResultsService],
  exports: [AnnualResultsService],
})
export class AnnualResultsModule {}
