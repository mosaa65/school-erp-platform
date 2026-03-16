import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { LookupGradeDescriptionsController } from './lookup-grade-descriptions.controller';
import { LookupGradeDescriptionsService } from './lookup-grade-descriptions.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [LookupGradeDescriptionsController],
  providers: [LookupGradeDescriptionsService],
  exports: [LookupGradeDescriptionsService],
})
export class LookupGradeDescriptionsModule {}
