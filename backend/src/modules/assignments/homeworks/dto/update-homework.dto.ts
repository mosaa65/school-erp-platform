import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateHomeworkDto } from './create-homework.dto';

export class UpdateHomeworkDto extends PartialType(
  OmitType(CreateHomeworkDto, ['autoPopulateStudents'] as const),
) {}
