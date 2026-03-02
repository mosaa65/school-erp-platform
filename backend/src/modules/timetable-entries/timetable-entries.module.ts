import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TimetableEntriesController } from './timetable-entries.controller';
import { TimetableEntriesService } from './timetable-entries.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [TimetableEntriesController],
  providers: [TimetableEntriesService],
  exports: [TimetableEntriesService],
})
export class TimetableEntriesModule {}
