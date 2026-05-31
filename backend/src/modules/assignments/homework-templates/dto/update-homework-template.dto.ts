import { PartialType } from '@nestjs/swagger';
import { CreateHomeworkTemplateDto } from './create-homework-template.dto';

export class UpdateHomeworkTemplateDto extends PartialType(
  CreateHomeworkTemplateDto,
) {}
