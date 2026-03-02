import { PartialType } from '@nestjs/swagger';
import { CreateAcademicMonthDto } from './create-academic-month.dto';

export class UpdateAcademicMonthDto extends PartialType(
  CreateAcademicMonthDto,
) {}
