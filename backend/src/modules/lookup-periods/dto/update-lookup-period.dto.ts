import { PartialType } from '@nestjs/swagger';
import { CreateLookupPeriodDto } from './create-lookup-period.dto';

export class UpdateLookupPeriodDto extends PartialType(CreateLookupPeriodDto) {}
