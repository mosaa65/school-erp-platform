import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TermSubjectOfferingsController } from './term-subject-offerings.controller';
import { TermSubjectOfferingsService } from './term-subject-offerings.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [TermSubjectOfferingsController],
  providers: [TermSubjectOfferingsService],
  exports: [TermSubjectOfferingsService],
})
export class TermSubjectOfferingsModule {}
