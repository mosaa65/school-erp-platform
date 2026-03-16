import { PartialType } from '@nestjs/swagger';
import { CreateLookupAbilityLevelDto } from './create-lookup-ability-level.dto';

export class UpdateLookupAbilityLevelDto extends PartialType(
  CreateLookupAbilityLevelDto,
) {}
