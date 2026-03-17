import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeSectionSupervisionDto } from './create-employee-section-supervision.dto';

export class UpdateEmployeeSectionSupervisionDto extends PartialType(
  CreateEmployeeSectionSupervisionDto,
) {}
