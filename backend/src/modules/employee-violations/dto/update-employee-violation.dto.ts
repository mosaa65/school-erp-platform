import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeViolationDto } from './create-employee-violation.dto';

export class UpdateEmployeeViolationDto extends PartialType(
  CreateEmployeeViolationDto,
) {}
