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
import { SystemSettingType } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateSystemSettingDto } from './dto/create-system-setting.dto';
import { ListSystemSettingsDto } from './dto/list-system-settings.dto';
import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';
import { SystemSettingsService } from './system-settings.service';

@ApiTags('System Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Post()
  @RequirePermissions('system-settings.create')
  @ApiOperation({ summary: 'Create system setting' })
  create(
    @Body() payload: CreateSystemSettingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.systemSettingsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('system-settings.read')
  @ApiOperation({ summary: 'Get paginated system settings' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'settingType', required: false, enum: SystemSettingType })
  @ApiQuery({ name: 'isEditable', required: false, type: Boolean })
  findAll(@Query() query: ListSystemSettingsDto) {
    return this.systemSettingsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('system-settings.read')
  @ApiOperation({ summary: 'Get system setting by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.systemSettingsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('system-settings.update')
  @ApiOperation({ summary: 'Update system setting' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateSystemSettingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.systemSettingsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('system-settings.delete')
  @ApiOperation({ summary: 'Soft delete system setting' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.systemSettingsService.remove(id, user.userId);
  }
}
