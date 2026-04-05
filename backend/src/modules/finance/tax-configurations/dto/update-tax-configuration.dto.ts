import { PartialType } from '@nestjs/swagger';
import { CreateTaxConfigurationDto } from './create-tax-configuration.dto';

export class UpdateTaxConfigurationDto extends PartialType(CreateTaxConfigurationDto) {}
