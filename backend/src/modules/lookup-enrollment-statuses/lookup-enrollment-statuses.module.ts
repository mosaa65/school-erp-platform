import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { LookupEnrollmentStatusesController } from './lookup-enrollment-statuses.controller';
import { LookupEnrollmentStatusesService } from './lookup-enrollment-statuses.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [LookupEnrollmentStatusesController],
  providers: [LookupEnrollmentStatusesService],
  exports: [LookupEnrollmentStatusesService],
})
export class LookupEnrollmentStatusesModule {}
