import { PartialType } from '@nestjs/swagger';
import { CreateStudentHomeworkDto } from './create-student-homework.dto';

export class UpdateStudentHomeworkDto extends PartialType(
  CreateStudentHomeworkDto,
) {}
