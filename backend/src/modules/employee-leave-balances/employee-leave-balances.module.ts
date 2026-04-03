import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeesModule } from '../employees/employees.module';
import { EmployeeLeaveBalancesController } from './employee-leave-balances.controller';
import { EmployeeLeaveBalancesService } from './employee-leave-balances.service';

@Module({
  imports: [AuditLogsModule, EmployeesModule],
  controllers: [EmployeeLeaveBalancesController],
  providers: [EmployeeLeaveBalancesService],
})
export class EmployeeLeaveBalancesModule {}
