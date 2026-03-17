import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { HomeworkTypesController } from './homework-types.controller';
import { HomeworkTypesService } from './homework-types.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [HomeworkTypesController],
  providers: [HomeworkTypesService],
  exports: [HomeworkTypesService],
})
export class HomeworkTypesModule {}
