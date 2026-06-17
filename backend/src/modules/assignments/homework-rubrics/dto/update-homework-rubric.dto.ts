import { PartialType } from '@nestjs/swagger';
import { CreateHomeworkRubricDto } from './create-homework-rubric.dto';

export class UpdateHomeworkRubricDto extends PartialType(
  CreateHomeworkRubricDto,
) {}
