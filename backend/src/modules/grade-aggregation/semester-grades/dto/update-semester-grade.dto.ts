import { PartialType } from '@nestjs/swagger';
import { CreateSemesterGradeDto } from './create-semester-grade.dto';

export class UpdateSemesterGradeDto extends PartialType(
  CreateSemesterGradeDto,
) {}
