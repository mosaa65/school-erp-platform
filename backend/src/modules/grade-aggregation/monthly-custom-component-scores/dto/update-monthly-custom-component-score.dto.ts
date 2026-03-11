import { PartialType } from '@nestjs/swagger';
import { CreateMonthlyCustomComponentScoreDto } from './create-monthly-custom-component-score.dto';

export class UpdateMonthlyCustomComponentScoreDto extends PartialType(
  CreateMonthlyCustomComponentScoreDto,
) {}
