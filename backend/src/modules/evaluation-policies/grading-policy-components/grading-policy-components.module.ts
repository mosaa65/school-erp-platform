import { Module } from '@nestjs/common';
import { GradingPolicyComponentsController } from './grading-policy-components.controller';
import { GradingPolicyComponentsService } from './grading-policy-components.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [GradingPolicyComponentsController],
  providers: [GradingPolicyComponentsService],
  exports: [GradingPolicyComponentsService],
})
export class GradingPolicyComponentsModule {}
