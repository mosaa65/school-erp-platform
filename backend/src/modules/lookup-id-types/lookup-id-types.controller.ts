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
import { CreateLookupIdTypeDto } from './dto/create-lookup-id-type.dto';
import { ListLookupIdTypesDto } from './dto/list-lookup-id-types.dto';
import { UpdateLookupIdTypeDto } from './dto/update-lookup-id-type.dto';
import { LookupIdTypesService } from './lookup-id-types.service';

@ApiTags('Lookup - ID Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('lookup/id-types')
export class LookupIdTypesController {
  constructor(private readonly lookupIdTypesService: LookupIdTypesService) {}

  @Post()
  @RequirePermissions('lookup-id-types.create')
  @ApiOperation({ summary: 'Create ID type lookup item' })
  create(
    @Body() payload: CreateLookupIdTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupIdTypesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('lookup-id-types.read')
  @ApiOperation({ summary: 'Get paginated ID type lookup items' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListLookupIdTypesDto) {
    return this.lookupIdTypesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('lookup-id-types.read')
  @ApiOperation({ summary: 'Get ID type lookup item by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lookupIdTypesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('lookup-id-types.update')
  @ApiOperation({ summary: 'Update ID type lookup item' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateLookupIdTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupIdTypesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('lookup-id-types.delete')
  @ApiOperation({ summary: 'Soft delete ID type lookup item' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.lookupIdTypesService.remove(id, user.userId);
  }
}
