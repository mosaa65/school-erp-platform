import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StudentsModule } from '../students/students.module';
import { StudentSiblingsController } from './student-siblings.controller';
import { StudentSiblingsService } from './student-siblings.service';

@Module({
  imports: [AuditLogsModule, StudentsModule],
  controllers: [StudentSiblingsController],
  providers: [StudentSiblingsService],
})
export class StudentSiblingsModule {}
