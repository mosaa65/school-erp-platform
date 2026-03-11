import { PartialType } from '@nestjs/swagger';
import { CreateExamAssessmentDto } from './create-exam-assessment.dto';

export class UpdateExamAssessmentDto extends PartialType(
  CreateExamAssessmentDto,
) {}
