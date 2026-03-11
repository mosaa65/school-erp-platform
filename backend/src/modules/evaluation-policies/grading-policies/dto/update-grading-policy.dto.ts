import { PartialType } from '@nestjs/swagger';
import { CreateGradingPolicyDto } from './create-grading-policy.dto';

export class UpdateGradingPolicyDto extends PartialType(
  CreateGradingPolicyDto,
) {}
