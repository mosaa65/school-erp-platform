import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { SchoolProfilesController } from './school-profiles.controller';
import { SchoolProfilesService } from './school-profiles.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [SchoolProfilesController],
  providers: [SchoolProfilesService],
  exports: [SchoolProfilesService],
})
export class SchoolProfilesModule {}
