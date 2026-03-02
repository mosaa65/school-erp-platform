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
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateLookupCatalogItemDto } from './dto/create-lookup-catalog-item.dto';
import { ListLookupCatalogItemsDto } from './dto/list-lookup-catalog-items.dto';
import { UpdateLookupCatalogItemDto } from './dto/update-lookup-catalog-item.dto';
import { LookupCatalogService } from './lookup-catalog.service';

@ApiTags('Lookup Catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('lookup/catalog')
export class LookupCatalogController {
  constructor(private readonly lookupCatalogService: LookupCatalogService) {}

  @Post(':type')
  @ApiOperation({ summary: 'Create item in a lookup catalog type' })
  @ApiParam({ name: 'type', example: 'school-types' })
  create(
    @Param('type') type: string,
    @Body() payload: CreateLookupCatalogItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupCatalogService.create(type, payload, user);
  }

  @Get(':type')
  @ApiOperation({ summary: 'Get paginated lookup catalog items by type' })
  @ApiParam({ name: 'type', example: 'school-types' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @Param('type') type: string,
    @Query() query: ListLookupCatalogItemsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupCatalogService.findAll(type, query, user);
  }

  @Get(':type/:id')
  @ApiOperation({ summary: 'Get lookup catalog item by type and ID' })
  @ApiParam({ name: 'type', example: 'school-types' })
  findOne(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupCatalogService.findOne(type, id, user);
  }

  @Patch(':type/:id')
  @ApiOperation({ summary: 'Update lookup catalog item by type and ID' })
  @ApiParam({ name: 'type', example: 'school-types' })
  update(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateLookupCatalogItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupCatalogService.update(type, id, payload, user);
  }

  @Delete(':type/:id')
  @ApiOperation({ summary: 'Soft delete lookup catalog item by type and ID' })
  @ApiParam({ name: 'type', example: 'school-types' })
  remove(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupCatalogService.remove(type, id, user);
  }
}
