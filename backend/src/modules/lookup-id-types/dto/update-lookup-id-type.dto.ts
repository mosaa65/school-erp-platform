import { PartialType } from '@nestjs/swagger';
import { CreateLookupIdTypeDto } from './create-lookup-id-type.dto';

export class UpdateLookupIdTypeDto extends PartialType(CreateLookupIdTypeDto) {}
