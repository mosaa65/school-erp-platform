import { PartialType } from '@nestjs/swagger';
import { CreateGradingOutcomeRuleDto } from './create-grading-outcome-rule.dto';

export class UpdateGradingOutcomeRuleDto extends PartialType(
  CreateGradingOutcomeRuleDto,
) {}
