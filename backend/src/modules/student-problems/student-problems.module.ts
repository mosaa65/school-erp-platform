import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StudentsModule } from '../students/students.module';
import { StudentProblemsController } from './student-problems.controller';
import { StudentProblemsService } from './student-problems.service';

@Module({
  imports: [AuditLogsModule, StudentsModule],
  controllers: [StudentProblemsController],
  providers: [StudentProblemsService],
})
export class StudentProblemsModule {}
