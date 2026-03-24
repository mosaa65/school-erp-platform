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
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { ListCurrenciesDto } from './dto/list-currencies.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { CurrenciesService } from './currencies.service';

@ApiTags('Finance - Currencies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Post()
  @RequirePermissions('currencies.create')
  @ApiOperation({ summary: 'Create currency' })
  create(@Body() payload: CreateCurrencyDto, @CurrentUser() user: AuthUser) {
    return this.currenciesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('currencies.read')
  @ApiOperation({ summary: 'Get paginated currencies' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isBase', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListCurrenciesDto) {
    return this.currenciesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('currencies.read')
  @ApiOperation({ summary: 'Get currency by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.currenciesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('currencies.update')
  @ApiOperation({ summary: 'Update currency' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCurrencyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.currenciesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('currencies.delete')
  @ApiOperation({ summary: 'Soft delete currency' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.currenciesService.remove(id, user.userId);
  }
}
