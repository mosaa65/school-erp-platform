import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { DataScopeModule } from '../../teaching-assignments/data-scope/data-scope.module';
import { StudentHomeworksController } from './student-homeworks.controller';
import { StudentHomeworksService } from './student-homeworks.service';

@Module({
  imports: [AuditLogsModule, DataScopeModule],
  controllers: [StudentHomeworksController],
  providers: [StudentHomeworksService],
  exports: [StudentHomeworksService],
})
export class StudentHomeworksModule {}
