import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CreateCurrencyExchangeRateDto } from './dto/create-currency-exchange-rate.dto';
import { ListCurrencyExchangeRatesDto } from './dto/list-currency-exchange-rates.dto';
import { UpdateCurrencyExchangeRateDto } from './dto/update-currency-exchange-rate.dto';
import { CurrencyExchangeRatesService } from './currency-exchange-rates.service';

@ApiTags('Finance - Currency Exchange Rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/currency-exchange-rates')
export class CurrencyExchangeRatesController {
  constructor(
    private readonly currencyExchangeRatesService: CurrencyExchangeRatesService,
  ) {}

  @Post()
  @RequirePermissions('currency-exchange-rates.create')
  @ApiOperation({ summary: 'Create currency exchange rate' })
  create(
    @Body() payload: CreateCurrencyExchangeRateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.currencyExchangeRatesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('currency-exchange-rates.read')
  @ApiOperation({ summary: 'Get paginated currency exchange rates' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'fromCurrencyId', required: false, type: Number })
  @ApiQuery({ name: 'toCurrencyId', required: false, type: Number })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListCurrencyExchangeRatesDto) {
    return this.currencyExchangeRatesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('currency-exchange-rates.read')
  @ApiOperation({ summary: 'Get currency exchange rate by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.currencyExchangeRatesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('currency-exchange-rates.update')
  @ApiOperation({ summary: 'Update currency exchange rate' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCurrencyExchangeRateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.currencyExchangeRatesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('currency-exchange-rates.delete')
  @ApiOperation({ summary: 'Soft delete currency exchange rate' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.currencyExchangeRatesService.remove(id, user.userId);
  }
}
