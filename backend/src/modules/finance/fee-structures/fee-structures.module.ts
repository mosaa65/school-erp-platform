import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { FeeStructuresController } from './fee-structures.controller';
import { FeeStructuresService } from './fee-structures.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [FeeStructuresController],
  providers: [FeeStructuresService],
  exports: [FeeStructuresService],
})
export class FeeStructuresModule {}
