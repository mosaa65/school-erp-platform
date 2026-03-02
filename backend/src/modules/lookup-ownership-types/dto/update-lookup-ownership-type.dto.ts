import { PartialType } from '@nestjs/swagger';
import { CreateLookupOwnershipTypeDto } from './create-lookup-ownership-type.dto';

export class UpdateLookupOwnershipTypeDto extends PartialType(
  CreateLookupOwnershipTypeDto,
) {}
