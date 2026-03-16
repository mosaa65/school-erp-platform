import { PartialType } from '@nestjs/swagger';
import { CreateStudentExamScoreDto } from './create-student-exam-score.dto';

export class UpdateStudentExamScoreDto extends PartialType(
  CreateStudentExamScoreDto,
) {}
