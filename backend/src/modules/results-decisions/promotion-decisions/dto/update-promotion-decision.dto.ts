import { PartialType } from '@nestjs/swagger';
import { CreatePromotionDecisionDto } from './create-promotion-decision.dto';

export class UpdatePromotionDecisionDto extends PartialType(
  CreatePromotionDecisionDto,
) {}
