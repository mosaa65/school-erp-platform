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
import { CreateLookupBloodTypeDto } from './dto/create-lookup-blood-type.dto';
import { ListLookupBloodTypesDto } from './dto/list-lookup-blood-types.dto';
import { UpdateLookupBloodTypeDto } from './dto/update-lookup-blood-type.dto';
import { LookupBloodTypesService } from './lookup-blood-types.service';

@ApiTags('Lookup - Blood Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('lookup/blood-types')
export class LookupBloodTypesController {
  constructor(
    private readonly lookupBloodTypesService: LookupBloodTypesService,
  ) {}

  @Post()
  @RequirePermissions('lookup-blood-types.create')
  @ApiOperation({ summary: 'Create blood type lookup item' })
  create(
    @Body() payload: CreateLookupBloodTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupBloodTypesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('lookup-blood-types.read')
  @ApiOperation({ summary: 'Get paginated blood type lookup items' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListLookupBloodTypesDto) {
    return this.lookupBloodTypesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('lookup-blood-types.read')
  @ApiOperation({ summary: 'Get blood type lookup item by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lookupBloodTypesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('lookup-blood-types.update')
  @ApiOperation({ summary: 'Update blood type lookup item' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateLookupBloodTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupBloodTypesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('lookup-blood-types.delete')
  @ApiOperation({ summary: 'Soft delete blood type lookup item' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.lookupBloodTypesService.remove(id, user.userId);
  }
}
