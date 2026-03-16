import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { LookupAbilityLevelsController } from './lookup-ability-levels.controller';
import { LookupAbilityLevelsService } from './lookup-ability-levels.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [LookupAbilityLevelsController],
  providers: [LookupAbilityLevelsService],
  exports: [LookupAbilityLevelsService],
})
export class LookupAbilityLevelsModule {}
