import { PartialType } from '@nestjs/swagger';
import { CreateLookupCatalogItemDto } from './create-lookup-catalog-item.dto';

export class UpdateLookupCatalogItemDto extends PartialType(
  CreateLookupCatalogItemDto,
) {}
