import { PartialType } from '@nestjs/swagger';
import { CreateLookupActivityTypeDto } from './create-lookup-activity-type.dto';

export class UpdateLookupActivityTypeDto extends PartialType(
  CreateLookupActivityTypeDto,
) {}
