import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StudentHomeworksController } from './student-homeworks.controller';
import { StudentHomeworksService } from './student-homeworks.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [StudentHomeworksController],
  providers: [StudentHomeworksService],
  exports: [StudentHomeworksService],
})
export class StudentHomeworksModule {}
