import { PartialType } from '@nestjs/swagger';
import { CreateAnnualStatusDto } from './create-annual-status.dto';

export class UpdateAnnualStatusDto extends PartialType(CreateAnnualStatusDto) {}
