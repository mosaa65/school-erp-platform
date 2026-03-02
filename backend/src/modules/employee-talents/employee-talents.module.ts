import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeesModule } from '../employees/employees.module';
import { TalentsModule } from '../talents/talents.module';
import { EmployeeTalentsController } from './employee-talents.controller';
import { EmployeeTalentsService } from './employee-talents.service';

@Module({
  imports: [AuditLogsModule, EmployeesModule, TalentsModule],
  controllers: [EmployeeTalentsController],
  providers: [EmployeeTalentsService],
})
export class EmployeeTalentsModule {}
