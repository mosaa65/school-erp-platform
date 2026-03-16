import { PartialType } from '@nestjs/swagger';
import { CreateLookupGradeDescriptionDto } from './create-lookup-grade-description.dto';

export class UpdateLookupGradeDescriptionDto extends PartialType(
  CreateLookupGradeDescriptionDto,
) {}
