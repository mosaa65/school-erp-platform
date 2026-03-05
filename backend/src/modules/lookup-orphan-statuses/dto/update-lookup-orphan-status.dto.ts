import { PartialType } from '@nestjs/swagger';
import { CreateLookupOrphanStatusDto } from './create-lookup-orphan-status.dto';

export class UpdateLookupOrphanStatusDto extends PartialType(
  CreateLookupOrphanStatusDto,
) {}
