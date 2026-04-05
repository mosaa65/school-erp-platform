import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeLifecycleChecklistDto } from './create-employee-lifecycle-checklist.dto';

export class UpdateEmployeeLifecycleChecklistDto extends PartialType(
  CreateEmployeeLifecycleChecklistDto,
) {}
