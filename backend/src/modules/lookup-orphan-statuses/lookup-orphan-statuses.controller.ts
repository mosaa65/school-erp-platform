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
import { CreateLookupOrphanStatusDto } from './dto/create-lookup-orphan-status.dto';
import { ListLookupOrphanStatusesDto } from './dto/list-lookup-orphan-statuses.dto';
import { UpdateLookupOrphanStatusDto } from './dto/update-lookup-orphan-status.dto';
import { LookupOrphanStatusesService } from './lookup-orphan-statuses.service';

@ApiTags('Lookup - Orphan Statuses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('lookup/orphan-statuses')
export class LookupOrphanStatusesController {
  constructor(
    private readonly lookupOrphanStatusesService: LookupOrphanStatusesService,
  ) {}

  @Post()
  @RequirePermissions('lookup-orphan-statuses.create')
  @ApiOperation({ summary: 'Create Orphan status lookup item' })
  create(
    @Body() payload: CreateLookupOrphanStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupOrphanStatusesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('lookup-orphan-statuses.read')
  @ApiOperation({ summary: 'Get paginated Orphan status lookup items' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListLookupOrphanStatusesDto) {
    return this.lookupOrphanStatusesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('lookup-orphan-statuses.read')
  @ApiOperation({ summary: 'Get Orphan status lookup item by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lookupOrphanStatusesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('lookup-orphan-statuses.update')
  @ApiOperation({ summary: 'Update Orphan status lookup item' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateLookupOrphanStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupOrphanStatusesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('lookup-orphan-statuses.delete')
  @ApiOperation({ summary: 'Soft delete Orphan status lookup item' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.lookupOrphanStatusesService.remove(id, user.userId);
  }
}
