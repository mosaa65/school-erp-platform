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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateLookupPeriodDto } from './dto/create-lookup-period.dto';
import { ListLookupPeriodsDto } from './dto/list-lookup-periods.dto';
import { UpdateLookupPeriodDto } from './dto/update-lookup-period.dto';
import { LookupPeriodsService } from './lookup-periods.service';

@ApiTags('Lookup - Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('lookup/periods')
export class LookupPeriodsController {
  constructor(private readonly lookupPeriodsService: LookupPeriodsService) {}

  @Post()
  @RequirePermissions('lookup-periods.create')
  @ApiOperation({ summary: 'Create period lookup item' })
  create(
    @Body() payload: CreateLookupPeriodDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupPeriodsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('lookup-periods.read')
  @ApiOperation({ summary: 'Get paginated period lookup items' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListLookupPeriodsDto) {
    return this.lookupPeriodsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('lookup-periods.read')
  @ApiOperation({ summary: 'Get period lookup item by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lookupPeriodsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('lookup-periods.update')
  @ApiOperation({ summary: 'Update period lookup item' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateLookupPeriodDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupPeriodsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('lookup-periods.delete')
  @ApiOperation({ summary: 'Soft delete period lookup item' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.lookupPeriodsService.remove(id, user.userId);
  }
}
