import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeAttendanceDto } from './create-employee-attendance.dto';

export class UpdateEmployeeAttendanceDto extends PartialType(
  CreateEmployeeAttendanceDto,
) {}
