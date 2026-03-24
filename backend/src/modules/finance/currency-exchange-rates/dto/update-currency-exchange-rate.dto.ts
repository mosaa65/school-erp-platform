import { PartialType } from '@nestjs/swagger';
import { CreateCurrencyExchangeRateDto } from './create-currency-exchange-rate.dto';

export class UpdateCurrencyExchangeRateDto extends PartialType(
  CreateCurrencyExchangeRateDto,
) {}
