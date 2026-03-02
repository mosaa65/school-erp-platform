import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TalentsController } from './talents.controller';
import { TalentsService } from './talents.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [TalentsController],
  providers: [TalentsService],
  exports: [TalentsService],
})
export class TalentsModule {}
