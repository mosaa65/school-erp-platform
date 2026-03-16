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
import { CreateLookupOwnershipTypeDto } from './dto/create-lookup-ownership-type.dto';
import { ListLookupOwnershipTypesDto } from './dto/list-lookup-ownership-types.dto';
import { UpdateLookupOwnershipTypeDto } from './dto/update-lookup-ownership-type.dto';
import { LookupOwnershipTypesService } from './lookup-ownership-types.service';

@ApiTags('Lookup - Ownership Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('lookup/ownership-types')
export class LookupOwnershipTypesController {
  constructor(
    private readonly lookupOwnershipTypesService: LookupOwnershipTypesService,
  ) {}

  @Post()
  @RequirePermissions('lookup-ownership-types.create')
  @ApiOperation({ summary: 'Create ownership type lookup item' })
  create(
    @Body() payload: CreateLookupOwnershipTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupOwnershipTypesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('lookup-ownership-types.read')
  @ApiOperation({ summary: 'Get paginated ownership type lookup items' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListLookupOwnershipTypesDto) {
    return this.lookupOwnershipTypesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('lookup-ownership-types.read')
  @ApiOperation({ summary: 'Get ownership type lookup item by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lookupOwnershipTypesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('lookup-ownership-types.update')
  @ApiOperation({ summary: 'Update ownership type lookup item' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateLookupOwnershipTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupOwnershipTypesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('lookup-ownership-types.delete')
  @ApiOperation({ summary: 'Soft delete ownership type lookup item' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.lookupOwnershipTypesService.remove(id, user.userId);
  }
}
