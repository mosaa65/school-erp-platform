import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeLeaveBalanceDto } from './create-employee-leave-balance.dto';

export class UpdateEmployeeLeaveBalanceDto extends PartialType(
  CreateEmployeeLeaveBalanceDto,
) {}
