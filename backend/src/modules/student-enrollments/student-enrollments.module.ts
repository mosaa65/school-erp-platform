import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StudentsModule } from '../students/students.module';
import { StudentEnrollmentsController } from './student-enrollments.controller';
import { StudentEnrollmentsService } from './student-enrollments.service';

@Module({
  imports: [AuditLogsModule, StudentsModule],
  controllers: [StudentEnrollmentsController],
  providers: [StudentEnrollmentsService],
  exports: [StudentEnrollmentsService],
})
export class StudentEnrollmentsModule {}
