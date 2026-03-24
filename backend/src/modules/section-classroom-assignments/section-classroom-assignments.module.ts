import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { SectionClassroomAssignmentsController } from './section-classroom-assignments.controller';
import { SectionClassroomAssignmentsService } from './section-classroom-assignments.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [SectionClassroomAssignmentsController],
  providers: [SectionClassroomAssignmentsService],
  exports: [SectionClassroomAssignmentsService],
})
export class SectionClassroomAssignmentsModule {}
