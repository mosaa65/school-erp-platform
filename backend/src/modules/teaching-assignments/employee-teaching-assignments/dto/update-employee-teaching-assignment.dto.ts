import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeTeachingAssignmentDto } from './create-employee-teaching-assignment.dto';

export class UpdateEmployeeTeachingAssignmentDto extends PartialType(
  CreateEmployeeTeachingAssignmentDto,
) {}
