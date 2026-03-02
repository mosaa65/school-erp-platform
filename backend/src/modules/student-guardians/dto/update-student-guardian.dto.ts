import { PartialType } from '@nestjs/swagger';
import { CreateStudentGuardianDto } from './create-student-guardian.dto';

export class UpdateStudentGuardianDto extends PartialType(
  CreateStudentGuardianDto,
) {}
