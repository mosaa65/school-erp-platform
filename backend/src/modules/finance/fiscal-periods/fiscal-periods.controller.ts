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
import { CreateFiscalPeriodDto } from './dto/create-fiscal-period.dto';
import { ListFiscalPeriodsDto } from './dto/list-fiscal-periods.dto';
import { UpdateFiscalPeriodDto } from './dto/update-fiscal-period.dto';
import { FiscalPeriodsService } from './fiscal-periods.service';

@ApiTags('Finance - Fiscal Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/fiscal-periods')
export class FiscalPeriodsController {
  constructor(private readonly fiscalPeriodsService: FiscalPeriodsService) {}

  @Post()
  @RequirePermissions('fiscal-periods.create')
  @ApiOperation({ summary: 'Create fiscal period' })
  create(
    @Body() payload: CreateFiscalPeriodDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.fiscalPeriodsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('fiscal-periods.read')
  @ApiOperation({ summary: 'Get paginated fiscal periods' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'fiscalYearId', required: false, type: Number })
  @ApiQuery({ name: 'periodType', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListFiscalPeriodsDto) {
    return this.fiscalPeriodsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('fiscal-periods.read')
  @ApiOperation({ summary: 'Get fiscal period by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fiscalPeriodsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('fiscal-periods.update')
  @ApiOperation({ summary: 'Update fiscal period' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateFiscalPeriodDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.fiscalPeriodsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('fiscal-periods.delete')
  @ApiOperation({ summary: 'Soft delete fiscal period' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.fiscalPeriodsService.remove(id, user.userId);
  }
}
