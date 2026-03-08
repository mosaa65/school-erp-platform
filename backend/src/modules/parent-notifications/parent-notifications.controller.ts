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
import {
  ParentNotificationSendMethod,
  ParentNotificationType,
} from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateParentNotificationDto } from './dto/create-parent-notification.dto';
import { ListParentNotificationsDto } from './dto/list-parent-notifications.dto';
import { UpdateParentNotificationDto } from './dto/update-parent-notification.dto';
import { ParentNotificationsService } from './parent-notifications.service';

@ApiTags('Parent Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('parent-notifications')
export class ParentNotificationsController {
  constructor(
    private readonly parentNotificationsService: ParentNotificationsService,
  ) {}

  @Post()
  @RequirePermissions('parent-notifications.create')
  @ApiOperation({ summary: 'Create parent notification' })
  create(
    @Body() payload: CreateParentNotificationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.parentNotificationsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('parent-notifications.read')
  @ApiOperation({ summary: 'Get paginated parent notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'notificationType', required: false, enum: ParentNotificationType })
  @ApiQuery({ name: 'guardianTitleId', required: false, type: Number })
  @ApiQuery({ name: 'sendMethod', required: false, enum: ParentNotificationSendMethod })
  @ApiQuery({ name: 'isSent', required: false, type: Boolean })
  @ApiQuery({ name: 'fromSentDate', required: false, type: String })
  @ApiQuery({ name: 'toSentDate', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListParentNotificationsDto) {
    return this.parentNotificationsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('parent-notifications.read')
  @ApiOperation({ summary: 'Get parent notification by ID' })
  findOne(@Param('id') id: string) {
    return this.parentNotificationsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('parent-notifications.update')
  @ApiOperation({ summary: 'Update parent notification' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateParentNotificationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.parentNotificationsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('parent-notifications.delete')
  @ApiOperation({ summary: 'Soft delete parent notification' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.parentNotificationsService.remove(id, user.userId);
  }
}
