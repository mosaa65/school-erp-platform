import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { AuditTrailController } from './audit-trail.controller';
import { AuditTrailService } from './audit-trail.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [AuditTrailController],
  providers: [AuditTrailService],
})
export class AuditTrailModule {}
