import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { PromotionDecisionsController } from './promotion-decisions.controller';
import { PromotionDecisionsService } from './promotion-decisions.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [PromotionDecisionsController],
  providers: [PromotionDecisionsService],
  exports: [PromotionDecisionsService],
})
export class PromotionDecisionsModule {}
