import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StudentsModule } from '../students/students.module';
import { TalentsModule } from '../talents/talents.module';
import { StudentTalentsController } from './student-talents.controller';
import { StudentTalentsService } from './student-talents.service';

@Module({
  imports: [AuditLogsModule, StudentsModule, TalentsModule],
  controllers: [StudentTalentsController],
  providers: [StudentTalentsService],
})
export class StudentTalentsModule {}
