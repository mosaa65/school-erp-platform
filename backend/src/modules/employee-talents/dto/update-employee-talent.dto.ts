import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeTalentDto } from './create-employee-talent.dto';

export class UpdateEmployeeTalentDto extends PartialType(
  CreateEmployeeTalentDto,
) {}
