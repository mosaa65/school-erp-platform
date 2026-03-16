import { PartialType } from '@nestjs/swagger';
import { CreateSchoolProfileDto } from './create-school-profile.dto';

export class UpdateSchoolProfileDto extends PartialType(
  CreateSchoolProfileDto,
) {}
