import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { GuardiansModule } from '../guardians/guardians.module';
import { StudentsModule } from '../students/students.module';
import { StudentGuardiansController } from './student-guardians.controller';
import { StudentGuardiansService } from './student-guardians.service';

@Module({
  imports: [AuditLogsModule, StudentsModule, GuardiansModule],
  controllers: [StudentGuardiansController],
  providers: [StudentGuardiansService],
  exports: [StudentGuardiansService],
})
export class StudentGuardiansModule {}
