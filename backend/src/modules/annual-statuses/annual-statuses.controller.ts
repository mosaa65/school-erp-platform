import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { CreateAnnualStatusDto } from './dto/create-annual-status.dto';
import { ListAnnualStatusesDto } from './dto/list-annual-statuses.dto';
import { UpdateAnnualStatusDto } from './dto/update-annual-status.dto';
import { AnnualStatusesService } from './annual-statuses.service';

@ApiTags('Annual Statuses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('annual-statuses')
export class AnnualStatusesController {
  constructor(private readonly annualStatusesService: AnnualStatusesService) {}

  @Post()
  @RequirePermissions('annual-statuses.create')
  @ApiOperation({ summary: 'Create annual subject status lookup item' })
  create(
    @Body() payload: CreateAnnualStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.annualStatusesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('annual-statuses.read')
  @ApiOperation({ summary: 'Get paginated annual statuses' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isSystem', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListAnnualStatusesDto) {
    return this.annualStatusesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('annual-statuses.read')
  @ApiOperation({ summary: 'Get annual status lookup item by ID' })
  findOne(@Param('id') id: string) {
    return this.annualStatusesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('annual-statuses.update')
  @ApiOperation({ summary: 'Update annual status lookup item' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAnnualStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.annualStatusesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('annual-statuses.delete')
  @ApiOperation({ summary: 'Soft delete annual status lookup item' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.annualStatusesService.remove(id, user.userId);
  }
}
