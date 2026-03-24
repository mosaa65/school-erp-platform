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
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';
import { ListFiscalYearsDto } from './dto/list-fiscal-years.dto';
import { UpdateFiscalYearDto } from './dto/update-fiscal-year.dto';
import { FiscalYearsService } from './fiscal-years.service';

@ApiTags('Finance - Fiscal Years')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/fiscal-years')
export class FiscalYearsController {
  constructor(private readonly fiscalYearsService: FiscalYearsService) {}

  @Post()
  @RequirePermissions('fiscal-years.create')
  @ApiOperation({ summary: 'Create fiscal year' })
  create(@Body() payload: CreateFiscalYearDto, @CurrentUser() user: AuthUser) {
    return this.fiscalYearsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('fiscal-years.read')
  @ApiOperation({ summary: 'Get paginated fiscal years' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'isClosed', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListFiscalYearsDto) {
    return this.fiscalYearsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('fiscal-years.read')
  @ApiOperation({ summary: 'Get fiscal year by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fiscalYearsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('fiscal-years.update')
  @ApiOperation({ summary: 'Update fiscal year' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateFiscalYearDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.fiscalYearsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('fiscal-years.delete')
  @ApiOperation({ summary: 'Soft delete fiscal year' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.fiscalYearsService.remove(id, user.userId);
  }
}
