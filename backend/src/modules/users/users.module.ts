import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmployeesModule } from '../employees/employees.module';
import { GuardiansModule } from '../guardians/guardians.module';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    AuditLogsModule,
    EmployeesModule,
    GuardiansModule,
    UserNotificationsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
