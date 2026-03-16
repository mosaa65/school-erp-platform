import { PartialType } from '@nestjs/swagger';
import { CreateLookupBloodTypeDto } from './create-lookup-blood-type.dto';

export class UpdateLookupBloodTypeDto extends PartialType(
  CreateLookupBloodTypeDto,
) {}
