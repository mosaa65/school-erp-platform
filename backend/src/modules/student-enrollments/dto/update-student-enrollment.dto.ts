import { PartialType } from '@nestjs/swagger';
import { CreateStudentEnrollmentDto } from './create-student-enrollment.dto';

export class UpdateStudentEnrollmentDto extends PartialType(
  CreateStudentEnrollmentDto,
) {}
