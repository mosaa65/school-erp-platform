import { PartialType } from '@nestjs/swagger';
import { CreateStudentTalentDto } from './create-student-talent.dto';

export class UpdateStudentTalentDto extends PartialType(
  CreateStudentTalentDto,
) {}

