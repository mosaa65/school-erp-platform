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
import { CreateLookupActivityTypeDto } from './dto/create-lookup-activity-type.dto';
import { ListLookupActivityTypesDto } from './dto/list-lookup-activity-types.dto';
import { UpdateLookupActivityTypeDto } from './dto/update-lookup-activity-type.dto';
import { LookupActivityTypesService } from './lookup-activity-types.service';

@ApiTags('Lookup - Activity Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('lookup/activity-types')
export class LookupActivityTypesController {
  constructor(
    private readonly lookupActivityTypesService: LookupActivityTypesService,
  ) {}

  @Post()
  @RequirePermissions('lookup-activity-types.create')
  @ApiOperation({ summary: 'Create Activity type lookup item' })
  create(
    @Body() payload: CreateLookupActivityTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupActivityTypesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('lookup-activity-types.read')
  @ApiOperation({ summary: 'Get paginated Activity type lookup items' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListLookupActivityTypesDto) {
    return this.lookupActivityTypesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('lookup-activity-types.read')
  @ApiOperation({ summary: 'Get Activity type lookup item by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lookupActivityTypesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('lookup-activity-types.update')
  @ApiOperation({ summary: 'Update Activity type lookup item' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateLookupActivityTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupActivityTypesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('lookup-activity-types.delete')
  @ApiOperation({ summary: 'Soft delete Activity type lookup item' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.lookupActivityTypesService.remove(id, user.userId);
  }
}
