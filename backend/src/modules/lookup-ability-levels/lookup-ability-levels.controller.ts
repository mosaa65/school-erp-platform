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
import { CreateLookupAbilityLevelDto } from './dto/create-lookup-ability-level.dto';
import { ListLookupAbilityLevelsDto } from './dto/list-lookup-ability-levels.dto';
import { UpdateLookupAbilityLevelDto } from './dto/update-lookup-ability-level.dto';
import { LookupAbilityLevelsService } from './lookup-ability-levels.service';

@ApiTags('Lookup - Ability Levels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('lookup/ability-levels')
export class LookupAbilityLevelsController {
  constructor(
    private readonly lookupAbilityLevelsService: LookupAbilityLevelsService,
  ) {}

  @Post()
  @RequirePermissions('lookup-ability-levels.create')
  @ApiOperation({ summary: 'Create Ability level lookup item' })
  create(
    @Body() payload: CreateLookupAbilityLevelDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupAbilityLevelsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('lookup-ability-levels.read')
  @ApiOperation({ summary: 'Get paginated Ability level lookup items' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListLookupAbilityLevelsDto) {
    return this.lookupAbilityLevelsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('lookup-ability-levels.read')
  @ApiOperation({ summary: 'Get Ability level lookup item by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lookupAbilityLevelsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('lookup-ability-levels.update')
  @ApiOperation({ summary: 'Update Ability level lookup item' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateLookupAbilityLevelDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupAbilityLevelsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('lookup-ability-levels.delete')
  @ApiOperation({ summary: 'Soft delete Ability level lookup item' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.lookupAbilityLevelsService.remove(id, user.userId);
  }
}
