import { PartialType } from '@nestjs/swagger';
import { CreateAnnualResultDto } from './create-annual-result.dto';

export class UpdateAnnualResultDto extends PartialType(CreateAnnualResultDto) {}
